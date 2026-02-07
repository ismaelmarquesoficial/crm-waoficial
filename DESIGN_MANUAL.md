# Manual de Identidade Visual - CRM WA Oficial

Este documento define os padrões visuais utilizados no sistema `Talke.ia - Premium WhatsApp CRM`.

## 1. Tipografia (Typography)
A fonte principal do sistema é **Plus Jakarta Sans**.

*   **Família:** `Plus Jakarta Sans`, sans-serif
*   **Importação:** Google Fonts
*   **Pesos Utilizados:**
    *   **Light (300):** Detalhes sutis, placeholders.
    *   **Regular (400):** Texto de corpo padrão.
    *   **Medium (500):** Legendas, textos secundários importantes.
    *   **SemiBold (600):** Botões, destaques, labels de inputs.
    *   **Bold (700):** Títulos de seções, cabeçalhos de cards.
    *   **ExtraBold (800):** Números grandes em dashboards, títulos principais.

## 2. Cores (Color Palette)

### Cores da Marca (Brand Colors)
| Nome | Hex | Uso Principal |
| :--- | :--- | :--- |
| **Meta Blue** | `#0668E1` | Cor primária, botões de ação, links, gráficos. |
| **WhatsApp Green** | `#25D366` | Sucesso, ações de mensagem, indicadores positivos. |
| **Ice** | `#F8FAFC` | Plano de fundo geral da aplicação. |

### Escala de Cinza (Slate Palette)
Utilizada para textos, bordas e fundos neutros para garantir legibilidade e hierarquia.

| Peso | Hex | Uso Sugerido |
| :--- | :--- | :--- |
| **50** | `#F8FAFC` | Fundo principal (Ice), áreas alternadas. |
| **100** | `#F1F5F9` | Fundos de cards secundários, hovers. |
| **200** | `#E2E8F0` | Bordas sutis, divisórias. |
| **300** | `#CBD5E1` | Ícones inativos, placeholders. |
| **400** | `#94A3B8` | Texto secundário (muted text). |
| **500** | `#64748B` | Texto de apoio, descrições. |
| **600** | `#475569` | Texto de corpo principal (contraste médio). |
| **700** | `#334155` | Subtítulos, labels importantes. |
| **800** | `#1E293B` | Títulos secundários, texto escuro. |
| **900** | `#0F172A` | Títulos principais, cor preta padrão. |

## 3. Degradês (Gradients)

O sistema utiliza degradês modernos para transmitir uma sensação premium.

*   **Brand Gradient (Principal):**
    *   CSS: `linear-gradient(135deg, #0668E1 0%, #25D366 100%)`
    *   Uso: Botões principais (`.btn-primary`), cards de destaque, logotipos.
*   **Glass Gradient (Vidro):**
    *   CSS: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)`
    *   Uso: Headers fixos, sobreposições, painéis flutuantes.
*   **Modal Header:**
    *   Tailwind: `bg-gradient-to-r from-blue-600 to-emerald-500`
    *   Uso: Cabeçalhos de modais e drawers.

## 4. Estilização de Componentes (UI Components)

### Cards
*   **Borda:** `rounded-2xl` ou `rounded-3xl` (Arredondamento acentuado).
*   **Fundo:** `bg-white` (Normalmente com transparência se usar efeito glass).
*   **Borda:** `border border-slate-100` ou `border-white/20` (em fundos glass).
*   **Sombras:**
    *   **Soft:** `0 4px 20px -2px rgba(0, 0, 0, 0.05)` (Padrão).
    *   **Floating:** `0 10px 30px -5px rgba(0, 0, 0, 0.08)` (Hover/Destaque).
    *   **Glow:** `0 0 15px rgba(6, 104, 225, 0.15)` (Elementos ativos/brand).

### Botões (.btn-primary)
*   Arredondamento: `rounded-xl`
*   Sombra: `shadow-lg shadow-blue-500/20`
*   Interação: `hover:contrast-125`, `active:scale-[0.98]`
*   Conteúdo: Ícone + Texto (Gap 12px)

### Ícones
*   **Biblioteca:** `Lucide React`
*   **Estilo:** Traço (Stroke)
*   **Espessuras:**
    *   **1.5px:** Padrão para ícones gerais.
    *   **2px:** Ícones ativos ou em destaque.
    *   **2.5px:** Ações primárias compactas.

## 5. Animações e Efeitos
O sistema preza por micro-interações fluidas.

*   **Fade In:** `animation: fadeIn 0.4s ease-out forwards;`
*   **Slide Up:** `animation: slideUp 0.5s ease-out forwards;`
*   **Transições:** `transition-all duration-300` é o padrão para hovers e mudanças de estado.
*   **Scrollbar:** Personalizada fina (`6px`) com thumb em `#cbd5e1` e track transparente.

## 6. Layout dos Cards e Inputs (Estética Premium)
Para o layout ficar moderno e bonito, siga estas regras de estrutura:

### Containers (Cards)
*   **Borda Superior:** Linha de degradê integrada ao topo.
*   **Arredondamento:** `24px` (Border-radius alto é a chave da modernidade).
*   **Sombra:** Suave e azulada `rgba(6, 104, 225, 0.05)`.
*   **Padding:** Espaçamento interno de `32px`.

### Inputs (Formulários)
*   **Fundo:** `#F8FAFC` (Cinza gelo).
*   **Sem Bordas:** Visual clean e sem ruído.
*   **Texto Interno:** Cor sólida com peso 500 (Medium).



#### Fomato de salvar a mensage enviada
O o formato salvo no banco de dados para as mensagens enviadas na coluna message da tabela chat_logs é um JSON string, onde salva o objeto inteiro da mensagem enviada, como o exemplo abaixo:

```json
{
    "id": "1234567890",
    "from": "1234567890",
    "to": "1234567890",
    "type": "text",
    "text": {
        "body": "Hello World"
    },
    "timestamp": "2022-01-01T00:00:00.000Z"
}
```

Na conversa, as mensagens interativas são renderizadas de forma "rica" (com botões e listas visíveis) graças ao processamento do JSON que você salva no banco.