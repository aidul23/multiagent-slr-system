import csv
from scholarly import ProxyGenerator, scholarly
import os
import requests
import xml.etree.ElementTree as ET
from urllib.parse import quote

api_key = os.getenv('ELSEVIER_API_KEY')

ieee_api_key = os.getenv('IEEE_API_KEY')
# Initialize a global variable to track if the proxy setup has been done
proxy_setup_done = False

def setup_proxy():
    global proxy_setup_done
    # Check if the proxy setup has already been done
    if not proxy_setup_done:
        # Set up a ProxyGenerator object to use free proxies
        pg = ProxyGenerator()
        pg.FreeProxies()
        scholarly.use_proxy(pg)
        
        # Mark the setup as done
        proxy_setup_done = True
        print("Proxy setup completed.")
    else:
        print("Proxy setup was already completed earlier in this session.")

# Example usage
setup_proxy()


def fetch_papers(search_string, min_results=8):
    search_query = scholarly.search_pubs(search_string)
    papers_details = []
    for _ in range(min_results):
        try:
            paper = next(search_query)
            paper_details = {
                'title': paper['bib']['title'],
                'author': paper['bib'].get('author'),
                'pub_year': paper['bib'].get('pub_year'),
                'publication_url': paper.get('pub_url', 'Not Available'),
                'journal_name': paper['bib'].get('journal', 'Not Available'),
                # Attempting to extract DOI, publication date, and making an educated guess on paper type
                'doi': paper.get('doi', 'Not Available'),
                'publication_date': paper['bib'].get('pub_year', 'Not Available'), # Simplified to publication year
                'paper_type': 'Journal' if 'journal' in paper['bib'] else 'Conference' if 'conference' in paper['bib'] else 'Primary Study' # Simplistic categorization
            }
            papers_details.append(paper_details)
        except StopIteration:
            break  # Exit if there are no more results
    return papers_details


def save_papers_to_csv(papers_details, filename='papers.csv'):
    fieldnames = ['title', 'author', 'pub_year', 'publication_url', 'journal_name', 'doi', 'publication_date', 'paper_type']
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for paper in papers_details:
            writer.writerow(paper)

def is_peer_reviewed(publication_name):
    """
    Check if the source with the given publication is peer-reviewed using Elsevier's Source API.
    """
    url = "https://api.elsevier.com/content/serial/title"
    headers = {
        "X-ELS-APIKey": api_key,
        "Accept": "application/json"
    }
    params = {
        "title": publication_name  # Use the publication name for the query
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx and 5xx)
        
        # Parse the response JSON
        data = response.json()
        print(f"REsponse: \n {data}")
        entries = data.get("serial-metadata-response", {}).get("entry", [])
        
        if not entries:
            print(f"No entries found for publication name: {publication_name}.")
            return False
        
        # Check the review status of the first matching entry
        for entry in entries:
            if entry.get("prism:aggregationType", "").lower() == "journal":
                print(f"Publication '{entry.get('dc:title')}' is a peer-reviewed.")
                return True
        
        # If none of the entries are peer-reviewed
        print(f"The publication '{publication_name}' is not peer-reviewed.")
        return False
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching source details for publication name '{publication_name}': {e}")
        return False
    except KeyError as e:
        print(f"Unexpected data format for publication name '{publication_name}': {e}")
        return False

def encode_search_string(search_string):
    encoded_string = urllib.parse.quote(search_string, safe='')
    return encoded_string

def search_elsevier(search_string, start_year, end_year, limit, is_english, is_peer_reviewed, keywords, is_cited):
    url = "https://api.elsevier.com/content/search/scopus"
    headers = {
        "X-ELS-APIKey": api_key,
        "Accept": "application/json"
    }

    # Set a reasonable max limit (Elsevier often limits total results per request)
    if not limit or limit > 500:
        limit = 500  

    print(f"Searching Elsevier with: English={is_english},Search String={search_string} Peer-reviewed={is_peer_reviewed}, Keywords={keywords}, Cited={is_cited}")

    # Construct query with proper Boolean syntax
    
    # if end_year and start_year != end_year:
    #     query = f'TITLE-ABS-KEY({search_string}) AND PUBYEAR >= {start_year} AND PUBYEAR <= {end_year}'
    # else:
    #     query = f'TITLE-ABS-KEY({search_string}) AND PUBYEAR = {start_year}'
        
    if end_year and start_year != end_year:
        query_parts = [f'TITLE-ABS({search_string})', f'PUBYEAR > {start_year}', f'PUBYEAR < {end_year}']
    else:
        query_parts = [f'TITLE-ABS({search_string})', f'PUBYEAR = {start_year}']

    # Add English language filter if needed
    if is_english:
        query_parts.append('LANGUAGE(english)')

    # Join all parts with AND
    query = ' AND '.join(f'({part})' for part in query_parts)


    total_fetched = 0
    start_index = 0
    max_per_request = 25  # Elsevier allows max 25 per request
    all_papers = []
    
    seen_dois = set()
    seen_titles = set()

    while total_fetched < limit:
        remaining = limit - total_fetched
        count = min(max_per_request, remaining)  # Request only what's allowed
        

        # Dynamically add sorting parameter based on is_cited
        if is_cited:
            params = {
                "query": query,
                "count": count,
                "start": start_index,
                "sort": "citedby-count"  
            }
        else:
            params = {
                "query": query,
                "count": count,
                "start": start_index
            }

        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()  # Raises an error for HTTP 4xx/5xx

            response_data = response.json()
            papers = response_data.get("search-results", {}).get("entry", [])

            if not papers:
                print("No more papers found.")
                break

            for paper in papers:
                title = paper.get("dc:title", "Not Available").lower()
                publication_name = paper.get("prism:publicationName", "Not Available")
                aggregation_type = paper.get("prism:aggregationType", "Not Available")
                aggregation_type = aggregation_type.lower() if isinstance(aggregation_type, str) else aggregation_type
                cited_count = int(paper.get("citedby-count", 0))
                abstract_url = paper.get("prism:url", None)
                
                # print(f"{paper.cited_count}")

                # Apply keyword filtering
                if keywords and not any(keyword.lower() in title for keyword in keywords):
                    continue

                # Apply peer-reviewed filter
                if is_peer_reviewed and aggregation_type != "journal":
                    continue
                
                abstract_text = fetch_elsevier_abstract(abstract_url) if abstract_url else "Abstract not available"

                parsed_paper = {
                    "creator": paper.get("dc:creator", "Not Available"),
                    "title": title,
                    "link": next((link["@href"] for link in paper.get("link", []) if link["@ref"] == "scopus"), "Not Available"),
                    "year": paper.get("prism:coverDate", "Not Available").split("-")[0],
                    "openaccess": paper.get("openaccess", "0") == "1",
                    "publicationName": publication_name,
                    "doi": paper.get("prism:doi", "Not Available"),
                    "citedby_count": cited_count,
                    "abstract": abstract_text
                }
                
                doi = paper.get("prism:doi", "").strip()
                title = paper.get("dc:title", "").strip().lower()

                # Skip if already seen
                if doi and doi in seen_dois:
                    continue
                if not doi and title in seen_titles:
                    continue

                # Add to seen sets
                if doi:
                    seen_dois.add(doi)
                else:
                    seen_titles.add(title)

                all_papers.append(parsed_paper)

            fetched_this_round = len(papers)
            total_fetched += fetched_this_round
            start_index += 1

            # Stop if we reach the total available papers
            total_results = int(response_data.get("search-results", {}).get("opensearch:totalResults", 0))
            if total_fetched >= total_results:
                print("Reached total available papers in Elsevier.")
                break

        except requests.exceptions.RequestException as e:
            print(f"Error fetching papers: {e}")
            break
        
    return all_papers

def search_arxiv(search_string, start_year, end_year, limit):
    search_query = f"all:{search_string}"
     # Ensure that start_year is always used in the query
    if end_year:
        search_query += f" AND submittedDate:[{start_year}01010000 TO {end_year}12312359]"
    else:
        search_query += f" AND submittedDate:[{start_year}01010000 TO {start_year}12312359]"
        # search_query = f"AND submittedDate:{start_year}"
    
    url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": limit
    }
    
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        try:
            root = ET.fromstring(response.content)
            ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
            
            entries = []
            for entry in root.findall('atom:entry', ns):
                authors = []
                for author in entry.findall('atom:author', ns):
                    author_name = author.find('atom:name', ns).text
                    authors.append(author_name)
                
                journal_ref = entry.find('arxiv:journal_ref', ns)
                doi = entry.find('arxiv:doi', ns)
                
                entry_data = {
                    "creator": ", ".join(authors) if authors else "Not Available",
                    "link": entry.find('atom:id', ns).text,  # Use the ID as the link
                    "year": entry.find('atom:published', ns).text.split("-")[0],
                    "title": entry.find('atom:title', ns).text.strip(),
                    "summary": entry.find('atom:summary', ns).text.strip(),
                    "openaccess": True,  # arXiv is generally open access
                    # "published": entry.find('atom:published', ns).text,
                    # "identifier": entry.find('atom:id', ns).text,
                    # "journal_ref": journal_ref.text if journal_ref is not None else "Not available",
                    # "authors": authors,
                    # "publicationName": journal_ref.text if journal_ref is not None else "Not Available",
                    # "aggregationType": "Journal Article",  # Assumed value
                    # "doi": doi.text if doi is not None else "Not Available"

                }
                entries.append(entry_data)
            
            return entries
        except ET.ParseError as e:
            print(f"Failed to parse XML: {e}")
            return []
    else:
        print(f"Failed to fetch papers from arXiv: {response.status_code} {response.text}")
        return []

def search_ieee_xplore(search_string, start_year, end_year, limit, is_english, is_peer_reviewed, keywords):
    """
    Search IEEE Xplore for articles matching the search string within the given year range.
    """

    print(f"ieee api key: {ieee_api_key}")
    url = "https://ieeexploreapi.ieee.org/api/v1/search/articles"
    headers = {
        "X-API-KEY": ieee_api_key,
        "Accept": "application/json"
    }
    
    query = f"\"{search_string}\""
    params = {
        "querytext": query,
        "start": 1,  # Starting index (you can modify this as needed)
        "maxrecords": limit,  # Limit the number of results
        "yearfrom": start_year,  # Filter by start year
        "yearto": end_year,  # Filter by end year
        "format": "json"
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()  # Raise HTTPError for bad responses
        
        # Parse the response JSON
        data = response.json()
        
        # Extract relevant fields from the articles
        articles = []
        for article in data.get("articles", []):
            parsed_article = {
                "title": article.get("title", "Not Available"),
                "authors": article.get("authors", "Not Available"),
                "doi": article.get("doi", "Not Available"),
                "publication_year": article.get("publication_year", "Not Available"),
                "publisher": article.get("publisher", "IEEE"),
                "url": article.get("url", "Not Available"),
                "article_id": article.get("article_id", "Not Available"),
                "abstract": article.get("abstract", "Not Available"),
            }
            articles.append(parsed_article)
        return articles

    except requests.exceptions.RequestException as e:
        print(f"Error fetching articles from IEEE Xplore: {e}")
        return {"error": f"Error fetching articles from IEEE Xplore: {e}"}
    
def search_semantic_scholar(search_string, start_year, end_year, limit, is_english, is_peer_reviewed, keywords):
    """
    Searches Semantic Scholar for relevant papers matching the search string and filters them based on the keywords.
    """
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    # headers = {"x-api-key": semantic_scholar_api_key}  # Optional if you have an API key
    
    
    print(f"search string: {search_string}")

    params = {
        "query": search_string,
        "limit": limit,
        "year": "2024-",
        "fields": "title,url,publicationTypes,publicationDate,openAccessPdf,authors"
    }

    response = requests.get(url, params=params)

    if response.status_code == 200:
        data = response.json()
        papers = data.get("data", [])
        parsed_papers = []

        for paper in papers:
            title = paper.get("title", "").lower()
            paper_id = paper.get("paperId", "")

            # # ✅ Apply keyword filtering: Only add papers where title contains at least one keyword
            # if not any(keyword.lower() in title for keyword in keywords):
            #     continue  # Skip if no keyword matches
            
            author_names = fetch_authors_from_paper_id(paper_id)

            parsed_paper = {
                "title": paper.get("title", "Not Available"),
                "authors": author_names if author_names else "Not Available",
                "year": paper.get("publicationDate", "Not Available"),
                "doi": paper.get("doi", "Not Available"),
                "url": paper.get("url", "Not Available"),
                "openAccessPdf": paper["openAccessPdf"]["url"] if paper.get("openAccessPdf") else "Not Available"
            }

            parsed_papers.append(parsed_paper)

        print(f"🔹 {len(parsed_papers)} papers found from Semantic Scholar")
        return parsed_papers
    else:
        print(f"❌ Failed to fetch papers from Semantic Scholar: {response.status_code} {response.text}")
        return {"error": "Failed to fetch papers from Semantic Scholar", "status_code": response.status_code, "message": response.text}

def fetch_elsevier_abstract(abstract_url):
    """
    Fetches the abstract of a paper from Elsevier using the provided `prism:url`.
    """
    headers = {
        "X-ELS-APIKey": api_key,
        "Accept": "application/json"
    }

    try:
        response = requests.get(abstract_url, headers=headers)
        response.raise_for_status()  

        data = response.json()
        print("Abstracts", data)
        abstract_text = data.get("abstracts-retrieval-response", {}).get("coredata", {}).get("dc:description", "Abstract not available")

        return abstract_text

    except requests.exceptions.RequestException as e:
        print(f"Error fetching abstract from URL {abstract_url}: {e}")
        return "Abstract not available"
        
def fetch_authors_from_paper_id(paper_id):
    """
    Fetches author details for a given paper ID.
    """
    if not paper_id:
        return None
    
    paper_url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}?fields=authors"
    response = requests.get(paper_url)

    if response.status_code == 200:
        paper_data = response.json()
        authors = paper_data.get("authors", [])
        author_names = ", ".join([author["name"] for author in authors if "name" in author])
        return author_names
    else:
        print(f"❌ Failed to fetch authors for paper {paper_id}")
        return None