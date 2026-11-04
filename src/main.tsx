import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import VistaImpressao from './print/VistaImpressao';
import { definirIdioma } from './i18n';

const imprimir = new URLSearchParams(location.search).get('imprimir') === '1';
// A janela invisível do PDF também precisa de saber a língua (partilha o localStorage com a janela principal)
try { definirIdioma(JSON.parse(localStorage.getItem('cena-um:definicoes') || '{}').idioma === 'en' ? 'en' : 'pt'); } catch {}

createRoot(document.getElementById('root')!).render(imprimir ? <VistaImpressao /> : <App />);
