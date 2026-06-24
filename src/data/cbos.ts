// Lista curada dos CBOs (Classificação Brasileira de Ocupações) mais utilizados.
// Fonte: MTE - Ministério do Trabalho. Para a lista completa consulte http://www.mtecbo.gov.br/
export type CBO = { codigo: string; titulo: string };

export const CBOS: CBO[] = [
  // Diretores e gerentes
  { codigo: "1210-05", titulo: "Diretor administrativo" },
  { codigo: "1211-05", titulo: "Diretor financeiro" },
  { codigo: "1212-05", titulo: "Diretor de recursos humanos" },
  { codigo: "1213-05", titulo: "Diretor comercial e de vendas" },
  { codigo: "1223-05", titulo: "Diretor de operações de obras" },
  { codigo: "1226-05", titulo: "Diretor de operações de serviços de logística" },
  { codigo: "1227-05", titulo: "Diretor de operações de serviços de saúde" },
  { codigo: "1410-05", titulo: "Gerente de loja e supermercado" },
  { codigo: "1411-05", titulo: "Gerente administrativo" },
  { codigo: "1412-05", titulo: "Gerente financeiro" },
  { codigo: "1414-05", titulo: "Gerente de recursos humanos" },
  { codigo: "1415-05", titulo: "Gerente de tecnologia da informação" },
  { codigo: "1417-05", titulo: "Gerente comercial" },
  { codigo: "1422-05", titulo: "Gerente de produção e operações" },
  { codigo: "1423-05", titulo: "Gerente de logística (armazenagem e distribuição)" },
  { codigo: "1424-05", titulo: "Gerente de obras na construção civil" },
  { codigo: "1425-05", titulo: "Gerente de manutenção" },
  { codigo: "1426-05", titulo: "Gerente de produção e operações de hotéis" },
  { codigo: "1427-05", titulo: "Gerente de restaurante" },
  { codigo: "1228-05", titulo: "Diretor de marketing" },

  // Administrativo
  { codigo: "2521-05", titulo: "Administrador" },
  { codigo: "2522-10", titulo: "Contador" },
  { codigo: "2522-15", titulo: "Auditor (contadores e afins)" },
  { codigo: "4110-05", titulo: "Auxiliar de escritório, em geral" },
  { codigo: "4110-10", titulo: "Assistente administrativo" },
  { codigo: "4131-25", titulo: "Auxiliar de contabilidade" },
  { codigo: "4131-10", titulo: "Auxiliar financeiro" },
  { codigo: "4132-20", titulo: "Auxiliar de pessoal" },
  { codigo: "4141-05", titulo: "Almoxarife" },
  { codigo: "4141-10", titulo: "Estoquista" },
  { codigo: "4151-05", titulo: "Arquivista de documentos" },
  { codigo: "4221-05", titulo: "Recepcionista, em geral" },
  { codigo: "4222-10", titulo: "Telefonista" },
  { codigo: "4223-15", titulo: "Operador de telemarketing ativo e receptivo" },
  { codigo: "5211-30", titulo: "Recepcionista atendente" },

  // RH
  { codigo: "1422-10", titulo: "Gerente de departamento pessoal" },
  { codigo: "2524-05", titulo: "Analista de recursos humanos" },
  { codigo: "2524-10", titulo: "Psicólogo organizacional" },
  { codigo: "4110-30", titulo: "Auxiliar de recursos humanos" },

  // TI
  { codigo: "1236-05", titulo: "Diretor de serviços de informática" },
  { codigo: "2123-05", titulo: "Administrador de redes" },
  { codigo: "2124-05", titulo: "Analista de desenvolvimento de sistemas" },
  { codigo: "2124-10", titulo: "Analista de sistemas de automação" },
  { codigo: "2124-15", titulo: "Analista de suporte computacional" },
  { codigo: "2124-20", titulo: "Programador de sistemas de informação" },
  { codigo: "3171-10", titulo: "Programador de internet" },
  { codigo: "3171-20", titulo: "Técnico de suporte ao usuário de tecnologia da informação" },
  { codigo: "3172-10", titulo: "Operador de computador (inclusive microcomputador)" },

  // Comercial / Vendas
  { codigo: "3541-25", titulo: "Supervisor de vendas comercial" },
  { codigo: "3541-05", titulo: "Comprador" },
  { codigo: "3542-05", titulo: "Representante comercial autônomo" },
  { codigo: "5211-10", titulo: "Operador de caixa" },
  { codigo: "5211-25", titulo: "Atendente de lojas e mercados" },
  { codigo: "5212-05", titulo: "Repositor de mercadorias" },
  { codigo: "5223-05", titulo: "Promotor de vendas" },
  { codigo: "5224-05", titulo: "Vendedor pracista" },
  { codigo: "5225-10", titulo: "Vendedor em domicílio" },
  { codigo: "5174-10", titulo: "Vendedor de comércio varejista" },

  // Logística / Transporte
  { codigo: "7823-05", titulo: "Motorista de caminhão (rotas regionais e internacionais)" },
  { codigo: "7824-05", titulo: "Motorista de carro de passeio" },
  { codigo: "7825-05", titulo: "Motorista de ônibus urbano" },
  { codigo: "7825-10", titulo: "Motorista de ônibus rodoviário" },
  { codigo: "7826-10", titulo: "Motociclista no transporte de documentos e pequenos volumes" },
  { codigo: "7832-25", titulo: "Carregador (veículos de transportes terrestres)" },
  { codigo: "7842-05", titulo: "Ajudante de motorista" },
  { codigo: "4141-15", titulo: "Conferente de carga e descarga" },
  { codigo: "7822-05", titulo: "Operador de empilhadeira" },

  // Produção / Indústria
  { codigo: "7842-15", titulo: "Auxiliar de produção" },
  { codigo: "7841-20", titulo: "Embalador, à mão" },
  { codigo: "5141-05", titulo: "Auxiliar de serviços gerais" },

  // Construção civil
  { codigo: "7152-10", titulo: "Pedreiro" },
  { codigo: "7155-05", titulo: "Servente de obras" },
  { codigo: "7156-15", titulo: "Pintor de obras" },
  { codigo: "7241-10", titulo: "Eletricista de instalações (edifícios)" },
  { codigo: "7244-10", titulo: "Encanador" },

  // Manutenção / Técnicos
  { codigo: "9112-05", titulo: "Mecânico de manutenção de máquinas industriais" },
  { codigo: "9144-05", titulo: "Mecânico de manutenção de automóveis, motocicletas e veículos similares" },
  { codigo: "9511-05", titulo: "Eletricista de manutenção eletroeletrônica" },
  { codigo: "3141-05", titulo: "Técnico mecânico (máquinas)" },
  { codigo: "3131-05", titulo: "Técnico eletricista" },

  // Saúde
  { codigo: "2235-05", titulo: "Enfermeiro" },
  { codigo: "3222-05", titulo: "Técnico de enfermagem" },
  { codigo: "3222-30", titulo: "Auxiliar de enfermagem" },
  { codigo: "2231-03", titulo: "Médico clínico" },
  { codigo: "2232-08", titulo: "Cirurgião-dentista (clínico geral)" },
  { codigo: "2236-05", titulo: "Fisioterapeuta geral" },
  { codigo: "2237-10", titulo: "Nutricionista" },
  { codigo: "2234-05", titulo: "Farmacêutico" },

  // Educação
  { codigo: "2312-05", titulo: "Professor de nível superior na educação infantil" },
  { codigo: "2321-05", titulo: "Professor de nível médio no ensino fundamental" },
  { codigo: "2313-05", titulo: "Professor de nível médio na educação infantil" },

  // Limpeza / Conservação / Serviços
  { codigo: "5142-05", titulo: "Auxiliar de limpeza" },
  { codigo: "5143-10", titulo: "Faxineiro" },
  { codigo: "5174-20", titulo: "Porteiro de edifícios" },
  { codigo: "5173-10", titulo: "Vigia" },
  { codigo: "5173-30", titulo: "Vigilante" },
  { codigo: "5132-05", titulo: "Cozinheiro geral" },
  { codigo: "5132-10", titulo: "Cozinheiro industrial" },
  { codigo: "5134-05", titulo: "Auxiliar de cozinha" },
  { codigo: "5134-25", titulo: "Garçom" },
  { codigo: "5134-15", titulo: "Atendente de lanchonete" },
  { codigo: "5121-05", titulo: "Camareira de hotel" },

  // Engenharia
  { codigo: "2142-05", titulo: "Engenheiro civil" },
  { codigo: "2144-05", titulo: "Engenheiro eletricista" },
  { codigo: "2144-15", titulo: "Engenheiro eletrônico" },
  { codigo: "2143-15", titulo: "Engenheiro mecânico" },
  { codigo: "2149-15", titulo: "Engenheiro de produção" },
  { codigo: "2149-25", titulo: "Engenheiro de segurança do trabalho" },

  // Marketing / Comunicação
  { codigo: "2531-05", titulo: "Analista de marketing" },
  { codigo: "2531-08", titulo: "Especialista de marketing" },
  { codigo: "2611-25", titulo: "Repórter (exclusive rádio e televisão)" },
  { codigo: "2625-05", titulo: "Publicitário" },
  { codigo: "2627-10", titulo: "Designer gráfico" },

  // Jurídico
  { codigo: "2410-05", titulo: "Advogado" },
  { codigo: "4110-50", titulo: "Auxiliar jurídico" },
];
