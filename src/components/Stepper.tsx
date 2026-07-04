interface StepperProps {
  steps: { label: string }[];
  current: number; // 0-based
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper" aria-label="진행 단계">
      {steps.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`step-node ${active ? 'active' : ''} ${done ? 'done' : ''}`}
            >
              <div className="step-circle">{done ? '✓' : i + 1}</div>
              <div>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`step-connector ${
                  i < current ? 'active' : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
