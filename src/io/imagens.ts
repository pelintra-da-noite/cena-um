/** Reduz uma imagem para não inchar o ficheiro .cena (JPEG, lado maior = max) */
export function reduzirImagem(dataUrl: string, max = 1400, qualidade = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => reject(new Error('Não foi possível ler esta imagem.'));
    img.src = dataUrl;
  });
}

export function lerFicheiroComoDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}
