import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import VistaImpressao from './print/VistaImpressao';

const imprimir = new URLSearchParams(location.search).get('imprimir') === '1';

createRoot(document.getElementById('root')!).render(imprimir ? <VistaImpressao /> : <App />);
