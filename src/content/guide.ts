// Guia rápido para brasileiros indo para a Flórida e o Canadá.
// Regras e valores mudam: cada texto aponta o site oficial para conferir antes de pagar ou agendar.

export interface GuideBlock {
  h?: string
  p?: string
  list?: string[]
}

export interface GuideArticle {
  slug: string
  emoji: string
  title: string
  summary: string
  group: 'Antes de ir' | 'Dinheiro' | 'Lá' | 'Volta'
  blocks: GuideBlock[]
  links: { label: string; url: string }[]
}

export const GUIDE: GuideArticle[] = [
  {
    slug: 'visto-americano',
    emoji: '🇺🇸',
    group: 'Antes de ir',
    title: 'Visto americano',
    summary: 'Brasileiro precisa do visto de turista (B1/B2). É o item que mais demora: comece já.',
    blocks: [
      { p: 'Para turismo nos EUA, brasileiros precisam do visto B1/B2. Ele também é o que libera o eTA do Canadá, então é o primeiro passo de toda a viagem.' },
      {
        h: 'Passo a passo',
        list: [
          'Preencher o formulário DS-160 (online, em inglês). Guarde o número de confirmação.',
          'Criar conta no portal de agendamento e pagar a taxa consular.',
          'Agendar duas etapas: CASV (foto e digitais) e entrevista no consulado.',
          'Ir à entrevista com passaporte, confirmação do DS-160 e comprovantes (trabalho, renda, vínculos no Brasil).',
          'Se aprovado, o passaporte volta com o visto em alguns dias.'
        ]
      },
      {
        h: 'Fique de olho',
        list: [
          'Desde 2025 a entrevista presencial virou regra para quase todo mundo, inclusive crianças e idosos (há exceção estreita para algumas renovações).',
          'O tempo de espera muda muito de cidade para cidade e de mês para mês. Às vezes vale agendar em outra capital.',
          'Os EUA anunciaram uma taxa extra (Visa Integrity Fee). Confira no site oficial quanto está custando quando for pagar.',
          'Quem já tem visto válido: confira a data de validade. Ele precisa estar válido nos dias da viagem.'
        ]
      }
    ],
    links: [
      { label: 'Embaixada dos EUA: vistos', url: 'https://br.usembassy.gov/pt/visas-pt/' },
      { label: 'Agendamento (DS-160, taxa e entrevista)', url: 'https://ais.usvisa-info.com/pt-br/niv' },
      { label: 'Tempo de espera por cidade', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/global-visa-wait-times.html' }
    ]
  },
  {
    slug: 'eta-canada',
    emoji: '🇨🇦',
    group: 'Antes de ir',
    title: 'eTA do Canadá',
    summary: 'Com visto americano válido, dá para entrar no Canadá de avião só com a autorização eletrônica (eTA).',
    blocks: [
      { p: 'Brasileiros podem pedir a eTA (autorização eletrônica, bem mais simples que um visto) se tiverem visto americano de não imigrante válido ou tiverem tido visto canadense nos últimos 10 anos.' },
      {
        h: 'O que precisa saber',
        list: [
          'Só vale chegando de AVIÃO. Se forem cruzar a fronteira de carro, ônibus ou trem (ex.: Nova York → Niagara por terra), precisam do visto canadense de visitante.',
          'Peça depois que o visto americano sair. O pedido é online, costuma sair em minutos e a taxa é baixa.',
          'Vale por até 5 anos ou até o passaporte vencer, o que vier primeiro.',
          'Use só o site oficial do governo do Canadá. Existem sites que cobram muito mais pelo mesmo pedido.'
        ]
      },
      { h: 'Para esta viagem', p: 'Planejem o trecho Flórida → Canadá de avião (Orlando ou Miami para Toronto/Montreal têm voos diretos ou com uma conexão).' }
    ],
    links: [{ label: 'eTA: site oficial do governo do Canadá', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html' }]
  },
  {
    slug: 'passaporte',
    emoji: '🛂',
    group: 'Antes de ir',
    title: 'Passaporte',
    summary: 'Confira a validade agora. Se precisar de um novo, ele vem antes do visto.',
    blocks: [
      {
        list: [
          'O ideal é ter pelo menos 6 meses de validade além da data da volta.',
          'Se o passaporte vence antes ou durante a viagem, tire o novo antes de pedir o visto (o visto fica no passaporte).',
          'O agendamento é no site da Polícia Federal. Em época de férias as vagas somem rápido.'
        ]
      }
    ],
    links: [{ label: 'Polícia Federal: passaporte', url: 'https://www.gov.br/pf/pt-br/assuntos/passaporte' }]
  },
  {
    slug: 'seguro-viagem',
    emoji: '🏥',
    group: 'Antes de ir',
    title: 'Seguro viagem',
    summary: 'Não é obrigatório nos EUA nem no Canadá, mas atendimento médico lá é caríssimo.',
    blocks: [
      {
        list: [
          'Confira se cobre os dois países e todos os dias da viagem, inclusive os voos.',
          'Veja o valor de cobertura médica, se cobre doença preexistente, Covid e esportes/parques.',
          'Alguns cartões de crédito dão seguro viagem quando a passagem é paga com ele. Leia as condições.',
          'Salve a apólice e o telefone de emergência no app (Ideias → Documento).'
        ]
      }
    ],
    links: []
  },
  {
    slug: 'dinheiro',
    emoji: '💳',
    group: 'Dinheiro',
    title: 'Cartão, câmbio e IOF',
    summary: 'Cartão internacional ou conta global para o dia a dia, um pouco de espécie para gorjetas.',
    blocks: [
      {
        list: [
          'Compras no exterior têm IOF, seja no cartão de crédito, débito, conta global ou dinheiro em espécie. A alíquota já mudou várias vezes: confira a atual.',
          'Contas globais em dólar ajudam a travar o câmbio aos poucos, antes da viagem.',
          'Quando a maquininha perguntar "pagar em reais ou em dólares?", escolha a moeda local (dólar). A conversão da maquininha costuma sair mais cara.',
          'Leve um cartão reserva, guardado separado do principal.',
          'Na aba Câmbio do app dá para colocar o IOF e o spread do seu cartão e ver o custo real.'
        ]
      }
    ],
    links: [{ label: 'Receita Federal: IOF', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/iof' }]
  },
  {
    slug: 'gorjeta-impostos',
    emoji: '🧾',
    group: 'Dinheiro',
    title: 'Gorjeta e impostos',
    summary: 'O preço da etiqueta não é o preço final: o imposto entra no caixa e a gorjeta é esperada.',
    blocks: [
      {
        h: 'Imposto (sales tax)',
        list: [
          'Nos EUA e no Canadá, o imposto é somado só na hora de pagar. Na Flórida fica por volta de 6% a 7,5%, conforme a cidade.',
          'No Canadá varia por província: em Ontário (Toronto, Niagara) é 13%; em Quebec (Montreal), perto de 15%.',
          'Hotéis e aluguel de carro costumam ter taxas extras (resort fee, taxa de turismo).'
        ]
      },
      {
        h: 'Gorjeta',
        list: [
          'Restaurante com garçom: 18% a 20% nos EUA, 15% a 20% no Canadá. Confira se a conta já veio com "service charge".',
          'Bar: 1 a 2 dólares por bebida. Uber: 10% a 15% pelo app.',
          'Fast food e balcão: opcional.'
        ]
      }
    ],
    links: []
  },
  {
    slug: 'carro',
    emoji: '🚗',
    group: 'Lá',
    title: 'Carro e transporte',
    summary: 'Na Flórida, carro facilita muito. No Canadá, Toronto e Montreal funcionam bem de metrô.',
    blocks: [
      {
        h: 'Alugar carro',
        list: [
          'CNH brasileira válida + passaporte. A Permissão Internacional para Dirigir (PID) é recomendada e barata (Detran).',
          'Motorista com menos de 25 anos costuma pagar taxa extra.',
          'Pedágios na Flórida são quase todos eletrônicos (SunPass / Toll-By-Plate). Veja o pacote de pedágio da locadora.',
          'Seguro: entenda o que já está incluso antes de aceitar extras no balcão.',
          'Gasolina é vendida por galão (≈ 3,8 litros). Em muitos postos você paga antes.'
        ]
      },
      {
        h: 'Regras diferentes',
        list: [
          'Nos EUA a velocidade é em milhas por hora (mph); no Canadá, em km/h.',
          'Virar à direita no sinal vermelho, depois de parar, é permitido na Flórida e em Ontário, salvo placa proibindo. Na ilha de Montreal é proibido.',
          'Ônibus escolar parado com placa de STOP: todos param.'
        ]
      },
      { h: 'Sem carro', p: 'Uber e Lyft funcionam nos dois países. Entre Orlando e Miami existe trem (Brightline). Em Toronto e Montreal, metrô e ônibus resolvem.' }
    ],
    links: []
  },
  {
    slug: 'celular-tomada',
    emoji: '🔌',
    group: 'Lá',
    title: 'Celular, internet e tomadas',
    summary: 'eSIM resolve a internet nos dois países. Tomada é do tipo A/B, 120V.',
    blocks: [
      {
        list: [
          'eSIM com plano EUA + Canadá é o caminho mais prático. Confira se o seu celular aceita eSIM.',
          'Roaming da operadora brasileira também funciona, mas compare o preço.',
          'Tomadas tipo A/B (pinos chatos), 120V. Carregadores de celular e notebook são bivolt; secador e chapinha, confira.',
          'Leve um adaptador por pessoa e um filtro de linha para carregar tudo no quarto.',
          'Baixe os mapas offline e as reservas antes de sair do Wi-Fi.'
        ]
      }
    ],
    links: []
  },
  {
    slug: 'clima',
    emoji: '🌦️',
    group: 'Lá',
    title: 'Clima no meio do ano',
    summary: 'Flórida quente, úmida e com chuva de fim de tarde. Canadá com verão agradável.',
    blocks: [
      {
        list: [
          'Flórida em junho/julho: 30 °C a 34 °C, muito úmido, temporais rápidos à tarde quase todo dia.',
          'A temporada de furacões vai de 1º de junho a 30 de novembro. É raro estragar a viagem, mas acompanhem a previsão na semana e prefiram tarifas reembolsáveis.',
          'Toronto e Montreal no verão: 20 °C a 30 °C, noites mais frescas. Leve um casaco leve.',
          'Protetor solar, boné e garrafinha de água para os parques.',
          'O Roteiro do app mostra a previsão quando faltar até 15 dias, e antes disso como foi o tempo nos mesmos dias do ano passado.'
        ]
      }
    ],
    links: [{ label: 'Centro Nacional de Furacões (NOAA)', url: 'https://www.nhc.noaa.gov/' }]
  },
  {
    slug: 'parques',
    emoji: '🎢',
    group: 'Lá',
    title: 'Parques de Orlando',
    summary: 'Ingresso comprado antes, chegada na abertura e app oficial no celular.',
    blocks: [
      {
        list: [
          'Ingresso de vários dias sai mais barato por dia. Comparem pacotes (Disney, Universal, SeaWorld) com antecedência.',
          'Filas: os parques vendem acesso rápido (Lightning Lane na Disney, Express na Universal). Vejam se compensa nos dias mais cheios.',
          'Julho é alta temporada: 4 de julho (feriado americano) lota parques e tem fogos.',
          '1º de julho é o Canada Day: festa e fogos no Canadá, comércio fechado em parte.',
          'Usem a aba Ideias para votar nos parques e o Roteiro para encaixar um por dia.'
        ]
      }
    ],
    links: []
  },
  {
    slug: 'voltando',
    emoji: '🧳',
    group: 'Volta',
    title: 'Compras e Receita na volta',
    summary: 'Existe uma cota de isenção por pessoa para o que vem na mala. Passou disso, declara.',
    blocks: [
      {
        list: [
          'Chegando ao Brasil de avião há uma cota de isenção por pessoa para compras no exterior, e uma cota separada no free shop da chegada. Confira os valores atuais no site da Receita.',
          'Itens de uso pessoal (roupa, celular, notebook em uso) não entram na cota.',
          'Passou da cota? Declare pelo e-DBV antes de passar na alfândega e pague o imposto. Sai mais barato do que ser pego.',
          'Guarde as notas fiscais das compras maiores.'
        ]
      }
    ],
    links: [{ label: 'Receita Federal: viajantes', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/viajantes' }]
  }
]

export const GUIDE_BY_SLUG = Object.fromEntries(GUIDE.map((a) => [a.slug, a]))
