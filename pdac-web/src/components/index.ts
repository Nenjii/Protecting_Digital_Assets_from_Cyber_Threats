import { PdacAttackers } from './attackers';
import { PdacBreachFlow } from './breach-flow';
import { PdacChainBreaker } from './chain-breaker';
import { PdacChecklist } from './checklist';
import { PdacChecks } from './checks';
import { PdacCiaLab } from './cia-lab';
import { PdacCountdown } from './countdown';
import { PdacCryptoVisual } from './crypto-visual';
import { PdacDfdStride } from './dfd-stride';
import { PdacFillTemplate } from './fill-template';
import { PdacFirewallSim } from './firewall-sim';
import { PdacGlossaryPanel } from './glossary-panel';
import { PdacHashPrefixDemo } from './hash-prefix-demo';
import { PdacHouseSim } from './house-sim';
import { PdacInjectClock } from './inject-clock';
import { PdacKevCard } from './kev-card';
import { PdacLayersSim } from './layers-sim';
import { PdacLockSealSign } from './lock-seal-sign';
import { PdacMatchBoard } from './match-board';
import { PdacNetSim } from './net-sim';
import { PdacPasswordLab } from './password-lab';
import { PdacPhishOrLegit } from './phish-or-legit';
import { PdacPhraseIcon, PdacPhrases } from './phrases';
import { PdacQrPanel } from './qr-panel';
import { PdacRbacMatrix } from './rbac-matrix';
import { PdacRecall } from './recall';
import { PdacRevealGrid } from './reveal-grid';
import { PdacRevealPanel } from './reveal-panel';
import { PdacRiskMatrix } from './risk-matrix';
import { PdacStatProof } from './stat-proof';
import { PdacThreeSCheck } from './three-s-check';
import { PdacUrlAnatomy } from './url-anatomy';
import { PdacVoteReveal } from './vote-reveal';

const registry: Record<string, CustomElementConstructor> = {
  'pdac-match-board': PdacMatchBoard,
  'pdac-vote-reveal': PdacVoteReveal,
  'pdac-three-s-check': PdacThreeSCheck,
  'pdac-breach-flow': PdacBreachFlow,
  'pdac-countdown': PdacCountdown,
  'pdac-qr-panel': PdacQrPanel,
  'pdac-recall': PdacRecall,
  'pdac-inject-clock': PdacInjectClock,
  'pdac-glossary-panel': PdacGlossaryPanel,
  'pdac-fill-template': PdacFillTemplate,
  'pdac-checklist': PdacChecklist,
  'pdac-phish-or-legit': PdacPhishOrLegit,
  'pdac-dfd-stride': PdacDfdStride,
  'pdac-risk-matrix': PdacRiskMatrix,
  'pdac-firewall-sim': PdacFirewallSim,
  'pdac-crypto-visual': PdacCryptoVisual,
  'pdac-rbac-matrix': PdacRbacMatrix,
  'pdac-hash-prefix-demo': PdacHashPrefixDemo,
  'pdac-url-anatomy': PdacUrlAnatomy,
  'pdac-phrases': PdacPhrases,
  'pdac-phrase-icon': PdacPhraseIcon,
  'pdac-stat-proof': PdacStatProof,
  'pdac-net-sim': PdacNetSim,
  'pdac-cia-lab': PdacCiaLab,
  'pdac-attackers': PdacAttackers,
  'pdac-chain-breaker': PdacChainBreaker,
  'pdac-house-sim': PdacHouseSim,
  'pdac-layers-sim': PdacLayersSim,
  'pdac-password-lab': PdacPasswordLab,
  'pdac-kev-card': PdacKevCard,
  'pdac-lock-seal-sign': PdacLockSealSign,
  'pdac-reveal-grid': PdacRevealGrid,
  'pdac-checks': PdacChecks,
  'pdac-reveal-panel': PdacRevealPanel,
};

export function registerComponents(): void {
  for (const [name, ctor] of Object.entries(registry)) {
    if (!customElements.get(name)) customElements.define(name, ctor);
  }
}

export const componentNames = Object.keys(registry);
