import React from 'react';

type P = { t?: number };
const base = (t: number, children: React.ReactNode, sw = 1.7) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Claquete = ({ t = 18 }: P) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="#E6A84A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 9l2.5-5.5 15 2.5L21 9" /><path d="M8.5 4.4L10 9M14 5.3l1.5 3.7" />
  </svg>
);
export const ICasa = ({ t = 19 }: P) => base(t, <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />);
export const IGuiao = ({ t = 19 }: P) => base(t, <><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h7M9 15h7M9 7h4" /></>);
export const IQuadro = ({ t = 19 }: P) => base(t, <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></>);
export const IStoryboard = ({ t = 19 }: P) => base(t, <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 15l5-4 4 3 3-2 6 4" /><circle cx="16" cy="9" r="1.5" /></>);
export const ITecnico = ({ t = 19 }: P) => base(t, <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M3 14h18M9 4v16" /></>);
export const IDefinicoes = ({ t = 19 }: P) => base(t, <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>);
export const IProcura = ({ t = 14 }: P) => base(t, <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, 2);
export const ICima = ({ t = 14 }: P) => base(t, <path d="M6 15l6-6 6 6" />, 2);
export const IBaixo = ({ t = 14 }: P) => base(t, <path d="M6 9l6 6 6-6" />, 2);
export const IFoco = ({ t = 14 }: P) => base(t, <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />, 2);
export const IFechar = ({ t = 12 }: P) => base(t, <path d="M5 5l14 14M19 5L5 19" />, 2);
export const IImagem = ({ t = 32 }: P) => base(t, <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M4 16l4.5-4 3.5 3 2.5-2 5.5 4.5" /><circle cx="15" cy="8" r="1.6" /></>, 1.5);
export const IAbrir = ({ t = 15 }: P) => base(t, <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />);
export const IVisto = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 5.2l2.2 2.2L8.5 2.6" stroke="#ECEAE5" strokeWidth="1.6" fill="none" /></svg>
);
