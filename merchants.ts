import type { CategoryType } from "../domain.js";

export interface MerchantRule {
  /** Termos procurados na descrição já normalizada (ver normalize.ts). */
  keywords: string[];
  /** Nome canônico da categoria — precisa existir em defaultCategories.ts. */
  category: string;
  categoryType: CategoryType;
}

/**
 * Dicionário de estabelecimentos e termos comuns em extratos brasileiros.
 *
 * É o segundo nível de decisão da classificação: só é consultado quando o
 * usuário ainda não ensinou uma regra para aquela descrição. Regras aprendidas
 * sempre vencem o dicionário (ver classify.ts) — o que o usuário corrigiu uma
 * vez não volta a ser sugerido errado.
 *
 * A ordem importa: a primeira regra cujo termo aparece na descrição vence.
 * Por isso as categorias mais específicas (combustível, farmácia) vêm antes
 * das mais genéricas (supermercado, compras).
 */
export const MERCHANT_RULES: MerchantRule[] = [
  // Receitas
  {
    keywords: ["SALARIO", "FOLHA PAGAMENTO", "PROVENTOS", "REMUNERACAO", "VENCIMENTOS"],
    category: "Salário",
    categoryType: "income",
  },
  {
    keywords: ["RENDIMENTO", "DIVIDENDOS", "JUROS SOBRE", "JCP", "CDB", "TESOURO", "POUPANCA"],
    category: "Investimentos",
    categoryType: "income",
  },
  {
    keywords: ["FREELA", "FREELANCE", "PRESTACAO DE SERVICO", "HONORARIOS"],
    category: "Freelance",
    categoryType: "income",
  },
  {
    keywords: ["RESTITUICAO", "REEMBOLSO", "ESTORNO", "DEVOLUCAO"],
    category: "Renda extra",
    categoryType: "income",
  },

  // Combustível — antes de Transporte, senão "POSTO SHELL" cairia em Transporte.
  {
    keywords: [
      "POSTO",
      "IPIRANGA",
      "SHELL",
      "PETROBRAS",
      "BR DISTRIBUIDORA",
      "ALE COMBUSTIVEIS",
      "COMBUSTIVEL",
      "GASOLINA",
      "ETANOL",
      "AUTO POSTO",
    ],
    category: "Combustível",
    categoryType: "expense",
  },

  // Saúde — antes de Supermercado, senão "DROGARIA PACHECO" poderia confundir.
  {
    keywords: [
      "DROGARIA",
      "DROGASIL",
      "DROGA RAIA",
      "RAIA",
      "PACHECO",
      "FARMACIA",
      "PAGUE MENOS",
      "ULTRAFARMA",
      "PANVEL",
      "VENANCIO",
      "UNIMED",
      "AMIL",
      "BRADESCO SAUDE",
      "SULAMERICA SAUDE",
      "HAPVIDA",
      "NOTREDAME",
      "LABORATORIO",
      "FLEURY",
      "DASA",
      "HOSPITAL",
      "CLINICA",
      "ODONTO",
      "DENTISTA",
      "PSICOLOG",
      "TERAPIA",
    ],
    category: "Saúde",
    categoryType: "expense",
  },

  // Alimentação (delivery, restaurante, lanchonete, cafeteria)
  {
    keywords: [
      "IFOOD",
      "IFD",
      "RAPPI",
      "UBER EATS",
      "AIQFOME",
      "ZE DELIVERY",
      "RESTAURANTE",
      "LANCHONETE",
      "PIZZARIA",
      "HAMBURGUERIA",
      "CHURRASCARIA",
      "PADARIA",
      "CAFETERIA",
      "CAFE",
      "STARBUCKS",
      "MCDONALDS",
      "BURGER KING",
      "BK ",
      "SUBWAY",
      "HABIBS",
      "BOB S",
      "GIRAFFAS",
      "OUTBACK",
      "DIVINO FOGAO",
      "SPOLETO",
      "CACAU SHOW",
      "KOPENHAGEN",
      "BAR ",
      "BOTECO",
      "PUB ",
      "DELIVERY",
      "FOOD",
      "SORVETERIA",
      "ACAI",
      "SUSHI",
      "TEMAKI",
    ],
    category: "Alimentação",
    categoryType: "expense",
  },

  // Supermercado
  {
    keywords: [
      "SUPERMERCADO",
      "MERCADO",
      "HIPERMERCADO",
      "ATACADAO",
      "ASSAI",
      "CARREFOUR",
      "EXTRA",
      "PAO DE ACUCAR",
      "SENDAS",
      "GUANABARA",
      "MUNDIAL",
      "PREZUNIC",
      "ZONA SUL",
      "BIG BOMPRECO",
      "SAMS CLUB",
      "MAKRO",
      "TENDA ATACADO",
      "DIA SUPERMERCADO",
      "SUPER",
      "EMPORIO",
      "HORTIFRUTI",
      "SACOLAO",
      "ACOUGUE",
    ],
    category: "Supermercado",
    categoryType: "expense",
  },

  // Transporte
  {
    keywords: [
      "UBER",
      "99APP",
      "99 TECNOLOGIA",
      "99POP",
      "CABIFY",
      "TAXI",
      "BLABLACAR",
      "METRO",
      "CPTM",
      "SPTRANS",
      "BILHETE UNICO",
      "RIOCARD",
      "VLT",
      "ONIBUS",
      "RODOVIARIA",
      "BUSER",
      "CLICKBUS",
      "ESTACIONAMENTO",
      "ESTAPAR",
      "ZONA AZUL",
      "PEDAGIO",
      "SEM PARAR",
      "CONECTCAR",
      "VELOE",
      "LOCALIZA",
      "MOVIDA",
      "UNIDAS",
      "GOL LINHAS",
      "LATAM",
      "AZUL LINHAS",
      "AZUL VIAGENS",
      "DECOLAR",
      "123MILHAS",
      "MECANICA",
      "OFICINA",
      "AUTO CENTER",
      "PNEUS",
      "IPVA",
      "LICENCIAMENTO",
    ],
    category: "Transporte",
    categoryType: "expense",
  },

  // Assinaturas e streaming
  {
    keywords: [
      "NETFLIX",
      "SPOTIFY",
      "AMAZON PRIME",
      "PRIME VIDEO",
      "DISNEY",
      "STAR PLUS",
      "HBO",
      "MAX ",
      "PARAMOUNT",
      "APPLE COM",
      "APPLE SERVICES",
      "ITUNES",
      "GOOGLE ONE",
      "GOOGLE STORAGE",
      "YOUTUBE PREMIUM",
      "DEEZER",
      "TIDAL",
      "GLOBOPLAY",
      "CRUNCHYROLL",
      "DROPBOX",
      "MICROSOFT 365",
      "OFFICE 365",
      "ADOBE",
      "CANVA",
      "CHATGPT",
      "OPENAI",
      "NOTION",
      "GITHUB",
      "PLAYSTATION",
      "XBOX",
      "NINTENDO",
      "STEAM",
      "KINDLE",
      "AUDIBLE",
      "ASSINATURA",
    ],
    category: "Assinaturas",
    categoryType: "expense",
  },

  // Internet / telefone
  {
    keywords: [
      "VIVO",
      "CLARO",
      "TIM ",
      "OI FIXO",
      "OI MOVEL",
      "NEXTEL",
      "ALGAR",
      "SKY",
      "NET SERVICOS",
      "INTERNET",
      "BANDA LARGA",
      "FIBRA",
      "TELEFONIA",
      "TELECOM",
      "RECARGA CELULAR",
    ],
    category: "Internet/Telefone",
    categoryType: "expense",
  },

  // Energia
  {
    keywords: [
      "ENEL",
      "LIGHT SERVICOS",
      "CEMIG",
      "COPEL",
      "CELESC",
      "COELBA",
      "NEOENERGIA",
      "EQUATORIAL",
      "ELEKTRO",
      "CPFL",
      "EDP",
      "AMAZONAS ENERGIA",
      "ENERGIA ELETRICA",
      "ENERGISA",
    ],
    category: "Energia",
    categoryType: "expense",
  },

  // Água
  {
    keywords: ["SABESP", "CEDAE", "COPASA", "SANEPAR", "CAGECE", "EMBASA", "CASAN", "AGUA E ESGOTO", "SANEAMENTO"],
    category: "Água",
    categoryType: "expense",
  },

  // Moradia
  {
    keywords: ["ALUGUEL", "CONDOMINIO", "IMOBILIARIA", "IPTU", "SINDICO", "PORTARIA", "GAS ENCANADO", "COMGAS", "ULTRAGAZ"],
    category: "Moradia",
    categoryType: "expense",
  },

  // Educação
  {
    keywords: [
      "FACULDADE",
      "UNIVERSIDADE",
      "COLEGIO",
      "ESCOLA",
      "CURSO",
      "UDEMY",
      "ALURA",
      "COURSERA",
      "ROCKETSEAT",
      "DESCOMPLICA",
      "KUMON",
      "WIZARD",
      "CNA ",
      "FISK",
      "MENSALIDADE ESCOLAR",
      "MATERIAL ESCOLAR",
      "LIVRARIA",
      "SARAIVA",
      "CULTURA",
    ],
    category: "Educação",
    categoryType: "expense",
  },

  // Lazer
  {
    keywords: [
      "CINEMARK",
      "CINEPOLIS",
      "UCI CINEMAS",
      "CINEMA",
      "TEATRO",
      "SHOW",
      "INGRESSO",
      "SYMPLA",
      "EVENTIM",
      "TICKETMASTER",
      "PARQUE",
      "BOLICHE",
      "ACADEMIA",
      "SMART FIT",
      "BLUEFIT",
      "GYMPASS",
      "TOTALPASS",
      "AIRBNB",
      "BOOKING",
      "HOTEL",
      "POUSADA",
      "VIAGEM",
      "TURISMO",
    ],
    category: "Lazer",
    categoryType: "expense",
  },

  // Compras / varejo
  {
    keywords: [
      "MERCADO LIVRE",
      "MERCADOLIVRE",
      "MERCADOPAGO",
      "SHOPEE",
      "ALIEXPRESS",
      "AMAZON",
      "MAGAZINE LUIZA",
      "MAGALU",
      "AMERICANAS",
      "SUBMARINO",
      "SHOPTIME",
      "CASAS BAHIA",
      "PONTO FRIO",
      "FAST SHOP",
      "KABUM",
      "TERABYTE",
      "PICHAU",
      "LEROY MERLIN",
      "TELHANORTE",
      "C A ",
      "RENNER",
      "RIACHUELO",
      "MARISA",
      "ZARA",
      "HERING",
      "CENTAURO",
      "NIKE",
      "ADIDAS",
      "NETSHOES",
      "DAFITI",
      "SHEIN",
      "BOTICARIO",
      "NATURA",
      "AVON",
      "SEPHORA",
      "PETZ",
      "COBASI",
      "PETLOVE",
      "IKESAKI",
      "LOJAS",
    ],
    category: "Compras",
    categoryType: "expense",
  },

  // Financiamento / crédito
  {
    keywords: [
      "FINANCIAMENTO",
      "EMPRESTIMO",
      "CONSORCIO",
      "CREDIARIO",
      "PRESTACAO",
      "CDC ",
      "LEASING",
      "JUROS",
      "ENCARGOS",
      "IOF",
      "ANUIDADE",
    ],
    category: "Financiamento",
    categoryType: "expense",
  },

  // Impostos
  {
    keywords: ["DARF", "IMPOSTO DE RENDA", "IRPF", "INSS", "GPS ", "SIMPLES NACIONAL", "DAS ", "TRIBUTO", "RECEITA FEDERAL"],
    category: "Impostos",
    categoryType: "expense",
  },
];

/**
 * Procura o primeiro estabelecimento conhecido dentro da descrição normalizada.
 * Devolve `null` quando nada casa — nesse caso a classificação cai no fallback
 * por direção do valor, e a tela de conferência marca a linha como "sugestão
 * fraca" para o usuário revisar.
 */
export function matchMerchant(normalizedDescription: string): MerchantRule | null {
  // Os espaços nas bordas fazem os termos com espaço final ("TIM ", "BAR ")
  // casarem como palavra inteira, sem pegar "TIMBER" ou "BARBEARIA".
  const haystack = ` ${normalizedDescription} `;

  for (const rule of MERCHANT_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule;
    }
  }

  return null;
}
