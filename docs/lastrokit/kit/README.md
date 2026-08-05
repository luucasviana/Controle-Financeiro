# Lastro — kit da marca

Direção aprovada: **Linha d'água**. O manual completo está em
`lastro.html` (abra no navegador — o controle do nível é interativo).

## Arquivos

```
svg/
  lastro.svg              principal, fundo claro
  lastro-dark.svg         fundo escuro
  lastro-mono.svg         uma cor, herda currentColor
  lastro-selo.svg         o L com a linha d'água — favicon, avatar, ícone de app
  niveis/lastro-{25,50,78,96}.svg    estados de referência
png/
  lastro-1600.png         assinatura, fundo claro
  lastro-dark-1600.png    assinatura, fundo escuro
  lastro-selo-{32,180,192,512}.png   favicon, apple-touch-icon, PWA
```

Todas as letras já estão convertidas em contornos. Nada depende da fonte
estar instalada.

## Nível padrão

**62% submerso.** Use este valor em qualquer lugar fora do dashboard:
favicon, e-mail, documento, apresentação. O nível dinâmico só vive dentro do
produto, e de preferência num lugar só — o cabeçalho.

## Nível dinâmico

Só funciona com o SVG **inline** no HTML (dentro de `<img>` o JS não alcança
os `clipPath`).

```js
function nivelLastro(svg, fracao) {
  const f = Math.max(0, Math.min(1, fracao));
  const y = Math.round(100 * (1 - f) * 100) / 100;   // 0 = cheio, 100 = vazio

  svg.querySelector('#cimaa rect').setAttribute('height', 600 + y);
  svg.querySelector('#baixoa rect').setAttribute('y', y);
  svg.querySelector('path[stroke]')
     .setAttribute('d', `M-20 ${y} H-8 M517 ${y} H529`);
}

// R$ 2.480 de um orçamento de R$ 4.000
nivelLastro(document.querySelector('#logo'), 2480 / 4000);
```

Os `clipPath` de `lastro.svg` têm os ids `cimaa` e `baixoa`. Se você inlinar a
marca mais de uma vez na mesma página, renomeie os ids — ids duplicados fazem
os dois recortes apontarem para o mesmo lugar.

## Favicon e PWA

```html
<link rel="icon" href="/lastro-selo.svg" type="image/svg+xml">
<link rel="icon" href="/lastro-selo-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/lastro-selo-180.png">
<meta name="theme-color" content="#1F2937">
```

```json
{
  "name": "Lastro",
  "short_name": "Lastro",
  "theme_color": "#1F2937",
  "background_color": "#F8FAFC",
  "icons": [
    { "src": "/lastro-selo-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/lastro-selo-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Cores

```css
:root {
  --lastro-submerso: #1F2937;   /* o que já foi gasto */
  --lastro-emerso:   #B6C2CF;   /* o que ainda não foi */
  --lastro-linha:    #10B981;   /* a linha d'água */

  /* tema escuro: os papéis invertem, a lógica não */
  --lastro-submerso-dark: #F8FAFC;
  --lastro-emerso-dark:   #5D6B7B;
  --lastro-linha-dark:    #34D399;
}
```

A regra que importa: a parte **já gasta** é sempre a de maior contraste contra
o fundo. É ela que precisa pesar.

## Construção

Medidas em altura de caixa alta (**H**, a altura do L).

- Respiro: **0,5 H** livre em todos os lados.
- Largura mínima da assinatura: **130 px**. Abaixo disso, use o selo.
- Tamanho mínimo do selo: **20 px**.

## Não faça

- Puxar a linha d'água de ponta a ponta — vira texto riscado.
- Inverter claro e escuro: o claro sempre em cima.
- Inclinar ou curvar a linha. Superfície de água é horizontal.
- Animar o nível fora do dashboard.
- Redesenhar o **O**. O círculo perfeito é o que faz o corte funcionar.

## Tipografia

TeX Gyre Adventor Bold, geométrica de círculo perfeito na linhagem da Avant
Garde. Licença GUST Font License — permite modificação e uso comercial.
