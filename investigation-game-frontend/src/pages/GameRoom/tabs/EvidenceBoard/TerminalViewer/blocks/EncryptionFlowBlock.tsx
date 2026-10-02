import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './EncryptionFlowBlock.css';

function getStepsForAlgorithm(algorithm?: string): { label: string; detail?: string; token?: string }[] {
  switch (algorithm?.toLowerCase()) {
    case 'aes':
      return [
        { label: 'Key Expansion', detail: 'Round keys derived from cipher key' },
        { label: 'Initial Round', detail: 'AddRoundKey' },
        { label: 'Rounds 1-9', detail: 'SubBytes → ShiftRows → MixColumns → AddRoundKey' },
        { label: 'Final Round', detail: 'SubBytes → ShiftRows → AddRoundKey' },
      ];
    case 'rsa':
      return [
        { label: 'Key Generation', detail: 'p, q primes → n = pq, φ(n), e, d' },
        { label: 'Encryption', detail: 'c = m^e mod n' },
        { label: 'Decryption', detail: 'm = c^d mod n' },
      ];
    case 'chacha':
      return [
        { label: 'Key Setup', detail: '256-bit key, 96-bit nonce, 32-bit counter' },
        { label: 'Quarter Rounds', detail: '20 rounds (10 column + 10 diagonal)' },
        { label: 'State Output', detail: '512-bit keystream block' },
      ];
    default:
      return [];
  }
}

export default function EncryptionFlowBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'encryption_flow')) return null;
  const { steps, direction = 'v', algorithm } = block.props;
  const allSteps = steps.length > 0 ? steps : getStepsForAlgorithm(algorithm);

  const isHorizontal = direction === 'h';

  return (
    <div className={`tb-encryption-flow tb-dir-${direction}`}>
      <svg className="tb-encryption-flow__svg" viewBox={`0 0 ${isHorizontal ? allSteps.length * 180 : 300} ${isHorizontal ? 300 : allSteps.length * 140}`} preserveAspectRatio="none">
        <defs>
          <marker id="tb-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
          </marker>
        </defs>
        {allSteps.map((step, i) => {
          const x = isHorizontal ? 50 + i * 180 : 150;
          const y = isHorizontal ? 150 : 50 + i * 140;
          const nextX = isHorizontal ? 50 + (i + 1) * 180 : 150;
          const nextY = isHorizontal ? 150 : 50 + (i + 1) * 140;

          return (
            <g key={i}>
              {i < allSteps.length - 1 && (
                <line
                  x1={isHorizontal ? x + 80 : x}
                  y1={isHorizontal ? y : y + 70}
                  x2={isHorizontal ? nextX - 80 : nextX}
                  y2={isHorizontal ? nextY : nextY - 70}
                  stroke="var(--term-rule-soft)"
                  strokeWidth="2"
                  markerEnd="url(#tb-arrow)"
                />
              )}
              <foreignObject x={x - 80} y={y - 35} width={160} height={70}>
                <div className="tb-encryption-flow__step" style={{ transform: isHorizontal ? 'none' : 'translateX(-50%)' }}>
                  <div className="tb-encryption-flow__label">{step.label}</div>
                  {step.detail && <div className="tb-encryption-flow__detail">{step.detail}</div>}
                  {step.token && <div className="tb-encryption-flow__token">{step.token}</div>}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      {algorithm && <div className="tb-encryption-flow__algorithm">Algorithm: {algorithm.toUpperCase()}</div>}
    </div>
  );
}