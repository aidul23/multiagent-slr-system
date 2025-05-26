/**
 * @param {Object} props
 * @param {string[]} props.steps
 * @param {number} props.currentStep
 */
export function ProgressBar({ steps, currentStep }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index < currentStep
                  ? "bg-blue-600 text-white"
                  : index === currentStep
                    ? "bg-blue-100 text-blue-600 border-2 border-blue-600"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {index < currentStep ? "✓" : index + 1}
            </div>
            <span className={`text-xs mt-1 ${index === currentStep ? "font-medium" : "text-gray-500"}`}>{step}</span>
          </div>
        ))}
      </div>
      <div className="relative mt-2">
        <div className="absolute inset-0 flex">
          {steps.slice(0, -1).map((_, index) => (
            <div key={index} className="flex-1 px-2">
              <div
                className={`h-1 ${
                  index < currentStep - 1
                    ? "bg-blue-600"
                    : index === currentStep - 1 && currentStep < steps.length
                      ? "bg-gradient-to-r from-blue-600 to-gray-200"
                      : "bg-gray-200"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
