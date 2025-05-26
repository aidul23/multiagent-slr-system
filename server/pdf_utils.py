# pdf_utils.py
import os
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import warnings

warnings.filterwarnings("ignore")

# Tesseract config
pytesseract.pytesseract.tesseract_cmd = "/usr/local/bin/tesseract"
tesseract_lang = "fin+eng"

def recognize_text_from_image(image_path):
    try:
        text = pytesseract.image_to_string(Image.open(image_path), lang=tesseract_lang)
        return text.strip() if text else "No text detected"
    except Exception as e:
        print(f"Error during OCR: {e}")
        return "OCR failed"

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with fitz.open(pdf_path) as pdf:
            for page_num in range(len(pdf)):
                page = pdf.load_page(page_num)
                page_text = page.get_text()
                if not page_text.strip():
                    pix = page.get_pixmap()
                    image_path = f"temp_image_{page_num}.png"
                    pix.save(image_path)
                    page_text = recognize_text_from_image(image_path)
                    os.remove(image_path)
                text += page_text + "\n"
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return ""
    return text.strip()
