import React from "react";
import "../Style/StepProgress.css";

const StepProgress = ({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
}) => {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="step-progress-container">
      <div className="progress-bar-wrapper">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="steps-wrapper">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`step-item ${index === currentStep ? "active" : ""} 
                       ${completedSteps.includes(index) ? "completed" : ""}`}
            onClick={() => onStepClick?.(index)}
          >
            <div className="step-number">
              {completedSteps.includes(index) ? "✓" : index + 1}
            </div>
            <div className="step-label">{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepProgress;
