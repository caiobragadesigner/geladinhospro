// Sistema CRM Completo para Geladinhos Gourmet - Versão Evoluída
class CRMGeladinhos {
  constructor() {
    this.data = {
      clientes: [],
      produtos: [],
      bairros: [],
      estoque: [], // Histórico de produções
      estoqueAtual: {}, // Quantidade atual por produto {produtoId: quantidade}
      eventos: [],
      metas: {
        receitaMensal: 0,
        despesasMensais: 0,
        categoria: "",
        // Novas metas de vendas
        vendas: {
          diaria: 0,
          semanal: 0,
          mensal: 0,
        },
      },
      configuracoes: {
        nomeEmpresa: "Geladinhos Gourmet",
        formatoMoeda: "BRL",
        categoriasPersonalizadas: [],
        // Nova configuração do salário da Brenda
        salarioBrenda: {
          porcentagem: 15,
          ativo: true,
        },
      },
    };

    this.categorias = {
      receitas: ["Vendas", "Encomendas", "Pronta Entrega", "Extras"],
      despesas: [
        "Ingredientes",
        "Embalagens",
        "Combustível",
        "Marketing",
        "2R/Motoqueiro",
        "Aluguel",
        "Salário",
        "Luz",
        "Água",
        "Outros",
      ],
    };

    // Novos tipos de eventos incluindo BRINDES e VENDAS-IFOOD
    this.tiposEventos = [
      "VENDAS",
      "BRINDES",
      "VENDAS-IFOOD",
      "ENTRADAS",
      "DESPESAS",
      "IMPOSTOS",
      "OUTROS",
    ];

    this.currentSection = "dashboard";
    this.currentMetaTab = "receita";
    this.init();
  }

  init() {
    this.loadData();
    this.setupNavigation();
    this.setupEventListeners();
    this.populateInitialData();
    this.calculateEstoqueAtual();
    this.updateDashboard();
    this.updateAllSections();
  }

  // Gerenciamento de Dados
  loadData() {
    const savedData = localStorage.getItem("crm-geladinhos-data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.data = { ...this.data, ...parsed };
        // Inicializar novas estruturas se não existirem
        if (!this.data.estoqueAtual) {
          this.data.estoqueAtual = {};
        }
        if (!this.data.metas.vendas) {
          this.data.metas.vendas = { diaria: 0, semanal: 0, mensal: 0 };
        }
        if (!this.data.configuracoes.salarioBrenda) {
          this.data.configuracoes.salarioBrenda = {
            porcentagem: 15,
            ativo: true,
          };
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }
  }

  saveData() {
    try {
      localStorage.setItem("crm-geladinhos-data", JSON.stringify(this.data));
      this.updateEstatisticasGerais();
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      alert("Erro ao salvar dados. Verifique o espaço de armazenamento.");
    }
  }

  // Cálculo do Estoque Atual
  calculateEstoqueAtual() {
    // Resetar estoque atual
    this.data.estoqueAtual = {};

    // Adicionar produções
    this.data.estoque.forEach((producao) => {
      if (!this.data.estoqueAtual[producao.produtoId]) {
        this.data.estoqueAtual[producao.produtoId] = 0;
      }
      this.data.estoqueAtual[producao.produtoId] += producao.quantidade;
    });

    // Subtrair vendas, brindes e vendas iFood
    this.data.eventos
      .filter(
        (evento) =>
          ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(evento.tipo) &&
          evento.produtos
      )
      .forEach((venda) => {
        venda.produtos.forEach((produto) => {
          if (!this.data.estoqueAtual[produto.produtoId]) {
            this.data.estoqueAtual[produto.produtoId] = 0;
          }
          this.data.estoqueAtual[produto.produtoId] -= produto.quantidade;
          // Não permitir estoque negativo
          if (this.data.estoqueAtual[produto.produtoId] < 0) {
            this.data.estoqueAtual[produto.produtoId] = 0;
          }
        });
      });
  }

  // Utilitários
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatCurrency(value) {
    const formatoMoeda = this.data.configuracoes.formatoMoeda || "BRL";
    const opcoes = {
      BRL: { style: "currency", currency: "BRL" },
      USD: { style: "currency", currency: "USD" },
      EUR: { style: "currency", currency: "EUR" },
    };

    return new Intl.NumberFormat(
      "pt-BR",
      opcoes[formatoMoeda] || opcoes.BRL
    ).format(value || 0);
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString("pt-BR");
  }

  getCurrentMonth() {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }

  getCurrentWeek() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return { start: startOfWeek, end: endOfWeek };
  }

  getCurrentDay() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return { start, end };
  }

  // Navegação
  setupNavigation() {
    const navLinks = document.querySelectorAll(".sidebar-menu a[data-section]");
    const sections = document.querySelectorAll(".section");
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.querySelector(".sidebar");

    console.log(
      "Setting up navigation. Found links:",
      navLinks.length,
      "sections:",
      sections.length
    );

    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        const targetSection = link.getAttribute("data-section");
        console.log("Navigation clicked, target section:", targetSection);

        if (!targetSection) {
          console.error("data-section não encontrado para", link);
          return;
        }

        this.navigateToSection(targetSection);

        // Fechar sidebar no mobile
        if (window.innerWidth <= 768) {
          sidebar.classList.remove("active");
        }
      });
    });

    // Menu toggle para mobile
    if (menuToggle) {
      menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("active");
      });
    }

    // Botões de atalho
    this.setupShortcuts();
  }

  navigateToSection(targetSection) {
    const navLinks = document.querySelectorAll(".sidebar-menu a[data-section]");
    const sections = document.querySelectorAll(".section");

    console.log("Navigating to section:", targetSection);

    // Remove active class from all links and sections
    navLinks.forEach((l) => l.classList.remove("active"));
    sections.forEach((s) => s.classList.remove("active"));

    // Add active class to target link
    const targetLink = document.querySelector(
      `[data-section="${targetSection}"]`
    );
    if (targetLink) {
      targetLink.classList.add("active");
    }

    // Show corresponding section
    const section = document.getElementById(targetSection);
    if (section) {
      section.classList.add("active");
      this.currentSection = targetSection;
      this.updateSectionContent(targetSection);
      console.log("Successfully navigated to section:", targetSection);
    } else {
      console.error("Seção não encontrada:", targetSection);
    }
  }

  setupShortcuts() {
    const shortcutBtns = document.querySelectorAll(".shortcut-btn");

    shortcutBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");

        switch (action) {
          case "clientes":
            this.navigateToSection("clientes");
            break;
          case "produtos":
            this.navigateToSection("produtos");
            break;
          case "eventos":
            this.navigateToSection("eventos");
            break;
          case "backup":
            this.fazerBackup();
            break;
        }
      });
    });
  }

  updateSectionContent(section) {
    console.log("Updating content for section:", section);

    switch (section) {
      case "dashboard":
        this.updateDashboard();
        break;
      case "clientes":
        this.updateClientesTable();
        break;
      case "estoque":
        this.updateEstoqueTotalChart();
        this.updateEstoqueVisualizacao();
        this.updateEstoqueTable();
        this.updateEstoqueProdutoSelect();
        break;
      case "produtos":
        this.updateProdutosTable();
        break;
      case "taxa-entrega":
        this.updateBairrosTable();
        break;
      case "eventos":
        this.updateEventosTable();
        this.updateEventoSelects();
        break;
      case "relatorios":
        this.setupRelatorioFilters();
        break;
      case "metas":
        this.setupMetasTabs();
        this.updateMetasDisplay();
        break;
      case "configuracoes":
        this.updateConfiguracoes();
        break;
    }
  }

  // Event Listeners
  setupEventListeners() {
    // Configuração do Salário da Brenda
    this.setupSalarioBrendaListeners();

    // Tabs das Metas
    this.setupMetasTabs();

    // Formulário de Clientes
    const clienteForm = document.getElementById("cliente-form");
    if (clienteForm) {
      clienteForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addCliente();
      });
    }

    // Cancelar edição de cliente
    const cancelarEdicaoCliente = document.getElementById(
      "cancelar-edicao-cliente"
    );
    if (cancelarEdicaoCliente) {
      cancelarEdicaoCliente.addEventListener("click", () => {
        this.cancelarEdicaoCliente();
      });
    }

    // Busca de clientes
    const buscarCliente = document.getElementById("buscar-cliente");
    if (buscarCliente) {
      buscarCliente.addEventListener("input", (e) => {
        this.filterClientes(e.target.value);
      });
    }

    // Formulário de Produtos
    const produtoForm = document.getElementById("produto-form");
    if (produtoForm) {
      produtoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addProduto();
      });

      // Cálculo automático do valor final
      const custoProduto = document.getElementById("produto-custo");
      const lucroProduto = document.getElementById("produto-lucro");
      const valorFinal = document.getElementById("produto-valor-final");

      [custoProduto, lucroProduto].forEach((input) => {
        if (input) {
          input.addEventListener("input", () => {
            const custo = parseFloat(custoProduto.value) || 0;
            const lucro = parseFloat(lucroProduto.value) || 0;
            valorFinal.value = this.formatCurrency(custo + lucro);
          });
        }
      });
    }

    // Busca de produtos
    const buscarProduto = document.getElementById("buscar-produto");
    if (buscarProduto) {
      buscarProduto.addEventListener("input", (e) => {
        this.filterProdutos(e.target.value);
      });
    }

    // Cancelar edição de produto
    const cancelarEdicaoProduto = document.getElementById(
      "cancelar-edicao-produto"
    );
    if (cancelarEdicaoProduto) {
      cancelarEdicaoProduto.addEventListener("click", () => {
        this.cancelarEdicaoProduto();
      });
    }

    // Formulário de Bairros
    const bairroForm = document.getElementById("bairro-form");
    if (bairroForm) {
      bairroForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addBairro();
      });
    }

    // Busca de bairros
    const buscarBairro = document.getElementById("buscar-bairro");
    if (buscarBairro) {
      buscarBairro.addEventListener("input", (e) => {
        this.filterBairros(e.target.value);
      });
    }

    // Formulário de Estoque
    const estoqueForm = document.getElementById("estoque-form");
    if (estoqueForm) {
      estoqueForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addEstoque();
      });

      // Preview de cálculos do estoque
      const produtoSelect = document.getElementById("estoque-produto");
      const quantidadeInput = document.getElementById("estoque-quantidade");
      [produtoSelect, quantidadeInput].forEach((input) => {
        if (input) {
          input.addEventListener("change", () => this.updateEstoquePreview());
          input.addEventListener("input", () => this.updateEstoquePreview());
        }
      });
    }

    // Data atual no estoque
    const estoqueData = document.getElementById("estoque-data");
    if (estoqueData && !estoqueData.value) {
      estoqueData.valueAsDate = new Date();
    }

    // Formulário de Eventos
    const eventoForm = document.getElementById("evento-form");
    if (eventoForm) {
      eventoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addEvento();
      });
    }

    // Data atual no evento
    const eventoData = document.getElementById("evento-data");
    if (eventoData && !eventoData.value) {
      eventoData.valueAsDate = new Date();
    }

    // Tipo de evento
    const eventoTipo = document.getElementById("evento-tipo");
    if (eventoTipo) {
      eventoTipo.addEventListener("change", () => {
        this.updateEventoFields();
      });
    }

    // Tipo de entrega
    const eventoEntrega = document.getElementById("evento-entrega");
    if (eventoEntrega) {
      eventoEntrega.addEventListener("change", () => {
        this.toggleBairroField();
        this.updateSubtotal();
      });
    }

    // Tipo de pagamento
    const eventoPagamento = document.getElementById("evento-pagamento");
    if (eventoPagamento) {
      eventoPagamento.addEventListener("change", () => {
        this.toggleTaxaCartaoField();
        this.updateSubtotal();
      });
    }

    // Taxa do cartão
    const taxaCartaoTipo = document.getElementById("taxa-cartao-tipo");
    const taxaCartaoValor = document.getElementById("taxa-cartao-valor");
    [taxaCartaoTipo, taxaCartaoValor].forEach((input) => {
      if (input) {
        input.addEventListener("change", () => this.updateSubtotal());
        input.addEventListener("input", () => this.updateSubtotal());
      }
    });

    // Campo de desconto
    const eventoDesconto = document.getElementById("evento-desconto");
    if (eventoDesconto) {
      eventoDesconto.addEventListener("input", () => {
        this.updateSubtotal();
      });
    }

    // Adicionar produto à venda
    const addProdutoVenda = document.getElementById("adicionar-produto-venda");
    if (addProdutoVenda) {
      addProdutoVenda.addEventListener("click", () => {
        this.addProdutoVenda();
      });
    }

    // Filtros de eventos
    const filtroEventoTipo = document.getElementById("filtro-evento-tipo");
    if (filtroEventoTipo) {
      filtroEventoTipo.addEventListener("change", () => {
        this.aplicarFiltrosEventos();
      });
    }

    const pesquisaEventos = document.getElementById("pesquisa-eventos");
    if (pesquisaEventos) {
      pesquisaEventos.addEventListener("input", () => {
        this.aplicarFiltrosEventos();
      });
    }

    const filtroDataInicio = document.getElementById("filtro-data-inicio");
    if (filtroDataInicio) {
      filtroDataInicio.addEventListener("change", () => {
        this.aplicarFiltrosEventos();
      });
    }

    const filtroDataFim = document.getElementById("filtro-data-fim");
    if (filtroDataFim) {
      filtroDataFim.addEventListener("change", () => {
        this.aplicarFiltrosEventos();
      });
    }

    const limparFiltrosEventos = document.getElementById(
      "limpar-filtros-eventos"
    );
    if (limparFiltrosEventos) {
      limparFiltrosEventos.addEventListener("click", () => {
        this.limparFiltrosEventos();
      });
    }

    // Formulário de Metas
    const metasForm = document.getElementById("metas-form");
    if (metasForm) {
      metasForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveMetas();
      });
    }

    // Relatórios
    const gerarRelatorio = document.getElementById("gerar-relatorio");
    if (gerarRelatorio) {
      gerarRelatorio.addEventListener("click", () => {
        this.gerarRelatorio();
      });
    }

    // Exportar relatório XLS
    const exportarRelatorioXls = document.getElementById(
      "exportar-relatorio-xls"
    );
    if (exportarRelatorioXls) {
      exportarRelatorioXls.addEventListener("click", () => {
        this.exportarRelatorioXLS();
      });
    }

    // Filtro de tipo de evento nos relatórios
    const relatorioTipoEvento = document.getElementById(
      "relatorio-tipo-evento"
    );
    if (relatorioTipoEvento) {
      relatorioTipoEvento.addEventListener("change", () => {
        this.updateRelatorioCategorias();
      });
    }

    // Configurações
    this.setupConfiguracaoEventListeners();

    // Modal
    this.setupModalEventListeners();
  }

  // Configuração do Salário da Brenda
  setupSalarioBrendaListeners() {
    const brendaPorcentagem = document.getElementById("brenda-porcentagem");
    const salvarBrendaConfig = document.getElementById("salvar-brenda-config");

    if (brendaPorcentagem) {
      // Carregar valor salvo
      brendaPorcentagem.value =
        this.data.configuracoes.salarioBrenda.porcentagem;

      // Atualizar em tempo real
      brendaPorcentagem.addEventListener("input", () => {
        this.updateSalarioBrendaDisplay();
      });
    }

    if (salvarBrendaConfig) {
      salvarBrendaConfig.addEventListener("click", () => {
        this.saveSalarioBrendaConfig();
      });
    }

    // Atualizar display inicial
    this.updateSalarioBrendaDisplay();
  }

  updateSalarioBrendaDisplay() {
    const brendaPorcentagem = document.getElementById("brenda-porcentagem");
    const lucroParaBrenda = document.getElementById("lucro-para-brenda");
    const salarioBrendaValor = document.getElementById("salario-brenda-valor");
    const lucroAposBrenda = document.getElementById("lucro-apos-brenda");

    if (
      !brendaPorcentagem ||
      !lucroParaBrenda ||
      !salarioBrendaValor ||
      !lucroAposBrenda
    )
      return;

    // Calcular lucro líquido do mês atual
    const mesAtual = this.getCurrentMonth();
    const eventosMes = this.data.eventos.filter((evento) => {
      const dataEvento = new Date(evento.data);
      return dataEvento >= mesAtual.start && dataEvento <= mesAtual.end;
    });

    const receitaMes = eventosMes
      .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    const despesasMes = eventosMes
      .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    const lucroLiquido = receitaMes - despesasMes;
    const porcentagem = parseFloat(brendaPorcentagem.value) || 0;
    const salarioBrenda = (lucroLiquido * porcentagem) / 100;
    const lucroAposSalario = lucroLiquido - salarioBrenda;

    lucroParaBrenda.textContent = this.formatCurrency(lucroLiquido);
    salarioBrendaValor.textContent = this.formatCurrency(salarioBrenda);
    lucroAposBrenda.textContent = this.formatCurrency(lucroAposSalario);
  }

  saveSalarioBrendaConfig() {
    const brendaPorcentagem = document.getElementById("brenda-porcentagem");
    const porcentagem = parseFloat(brendaPorcentagem.value) || 0;

    if (porcentagem < 0 || porcentagem > 100) {
      alert("A porcentagem deve estar entre 0% e 100%.");
      return;
    }

    this.data.configuracoes.salarioBrenda.porcentagem = porcentagem;
    this.saveData();
    this.updateDashboard(); // Atualizar dashboard com novo cálculo
    alert("Configuração do salário da Brenda salva com sucesso!");
  }

  // Setup das Abas de Metas
  setupMetasTabs() {
    const metaTabs = document.querySelectorAll(".meta-tab");
    const metaContents = document.querySelectorAll(".meta-content");

    metaTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        const targetTab = tab.getAttribute("data-tab");

        // Remove active class from all tabs and contents
        metaTabs.forEach((t) => t.classList.remove("active"));
        metaContents.forEach((c) => c.classList.remove("active"));

        // Add active class to clicked tab
        tab.classList.add("active");

        // Show corresponding content
        const content = document.getElementById(`metas-${targetTab}`);
        if (content) {
          content.classList.add("active");
          this.currentMetaTab = targetTab;
        }
      });
    });
  }

  // Novo método para atualizar gráfico do estoque total
  updateEstoqueTotalChart() {
    const ctx = document.getElementById("estoque-total-chart");
    const totalElement = document.getElementById("total-geral-estoque");

    if (!ctx) return;

    // Calcular total geral
    const totalGeral = Object.values(this.data.estoqueAtual).reduce(
      (sum, qty) => sum + qty,
      0
    );

    if (totalElement) {
      totalElement.textContent = totalGeral;
    }

    // Preparar dados para o gráfico
    const labels = [];
    const data = [];
    const backgroundColors = [
      "#1FB8CD",
      "#FFC185",
      "#B4413C",
      "#ECEBD5",
      "#5D878F",
      "#DB4545",
      "#D2BA4C",
      "#964325",
      "#944454",
      "#13343B",
    ];

    this.data.produtos.forEach((produto, index) => {
      const quantidade = this.data.estoqueAtual[produto.id] || 0;
      if (quantidade > 0) {
        labels.push(produto.nome);
        data.push(quantidade);
      }
    });

    // Destruir gráfico anterior se existir
    if (this.estoqueTotalChart) {
      this.estoqueTotalChart.destroy();
    }

    // Criar novo gráfico
    this.estoqueTotalChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Quantidade em Estoque",
            data: data,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.parsed.y} unidades`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
      },
    });
  }

  setupConfiguracaoEventListeners() {
    // Fazer backup
    const fazerBackup = document.getElementById("fazer-backup");
    if (fazerBackup) {
      fazerBackup.addEventListener("click", () => {
        this.fazerBackup();
      });
    }

    // Importar backup
    const importarBackup = document.getElementById("importar-backup");
    if (importarBackup) {
      importarBackup.addEventListener("change", (e) => {
        if (e.target.files[0]) {
          this.importarBackup(e.target.files[0]);
        }
      });
    }

    // Resetar sistema
    const resetarSistema = document.getElementById("resetar-sistema");
    if (resetarSistema) {
      resetarSistema.addEventListener("click", () => {
        this.showConfirmModal(
          "Resetar Sistema",
          "Tem certeza que deseja resetar todo o sistema? Esta ação é irreversível e apagará todos os dados permanentemente.",
          () => this.resetarSistema()
        );
      });
    }

    // Configurações avançadas
    const configAvancadasForm = document.getElementById(
      "config-avancadas-form"
    );
    if (configAvancadasForm) {
      configAvancadasForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveConfiguracoes();
      });
    }
  }

  setupModalEventListeners() {
    const confirmModal = document.getElementById("confirm-modal");
    const confirmCancel = document.getElementById("confirm-cancel");
    const confirmOk = document.getElementById("confirm-ok");
    const clienteModal = document.getElementById("cliente-modal");
    const clienteModalClose = document.getElementById("cliente-modal-close");
    const editEventoModal = document.getElementById("edit-evento-modal");
    const cancelEditEvento = document.getElementById("cancel-edit-evento");

    if (confirmCancel) {
      confirmCancel.addEventListener("click", () => {
        confirmModal.classList.remove("active");
      });
    }

    if (confirmOk) {
      confirmOk.addEventListener("click", () => {
        if (this.confirmCallback) {
          this.confirmCallback();
          this.confirmCallback = null;
        }
        confirmModal.classList.remove("active");
      });
    }

    if (clienteModalClose) {
      clienteModalClose.addEventListener("click", () => {
        clienteModal.classList.remove("active");
      });
    }

    if (cancelEditEvento) {
      cancelEditEvento.addEventListener("click", () => {
        editEventoModal.classList.remove("active");
      });
    }

    // Formulário de edição de evento
    const editEventoForm = document.getElementById("edit-evento-form");
    if (editEventoForm) {
      editEventoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.updateEvento();
      });
    }

    // Atualizar categorias quando o tipo mudar
    const editEventoTipo = document.getElementById("edit-evento-tipo");
    if (editEventoTipo) {
      editEventoTipo.addEventListener("change", () => {
        this.updateEditEventoCategorias();
      });
    }

    // Fechar modal clicando fora
    [confirmModal, clienteModal, editEventoModal].forEach((modal) => {
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            modal.classList.remove("active");
          }
        });
      }
    });
  }

  // Dados Iniciais
  populateInitialData() {
    if (this.data.produtos.length === 0) {
      const produtosExemplo = [
        { nome: "Ninho com Nutella", custo: 3.35, lucro: 2.01 },
        { nome: "Ninho com Geleia de Morango", custo: 2.8, lucro: 1.68 },
        { nome: "Ninho com Oreo", custo: 3.32, lucro: 1.99 },
      ];

      produtosExemplo.forEach((produto) => {
        this.data.produtos.push({
          id: this.generateId(),
          nome: produto.nome,
          custo: produto.custo,
          lucro: produto.lucro,
          valorFinal: produto.custo + produto.lucro,
          margem: (
            (produto.lucro / (produto.custo + produto.lucro)) *
            100
          ).toFixed(1),
        });
      });
    }

    if (this.data.bairros.length === 0) {
      const bairrosExemplo = [
        { nome: "Centro", taxa: 3.0 },
        { nome: "Jardim Europa", taxa: 5.0 },
        { nome: "Vila Nova", taxa: 4.0 },
        { nome: "Residencial Park", taxa: 6.0 },
      ];

      bairrosExemplo.forEach((bairro) => {
        this.data.bairros.push({
          id: this.generateId(),
          nome: bairro.nome,
          taxa: bairro.taxa,
        });
      });
    }

    this.saveData();
  }

  updateAllSections() {
    this.updateClientesTable();
    this.updateProdutosTable();
    this.updateBairrosTable();
    this.updateEstoqueTotalChart();
    this.updateEstoqueVisualizacao();
    this.updateEstoqueTable();
    this.updateEventosTable();
    this.updateEstoqueProdutoSelect();
    this.updateEventoSelects();
    this.updateMetasDisplay();
    this.updateConfiguracoes();
  }

  // Dashboard
  updateDashboard() {
    const mesAtual = this.getCurrentMonth();

    // Filtrar eventos do mês atual
    const eventosMes = this.data.eventos.filter((evento) => {
      const dataEvento = new Date(evento.data);
      return dataEvento >= mesAtual.start && dataEvento <= mesAtual.end;
    });

    // Calcular métricas (VENDAS-IFOOD não conta no lucro imediato)
    const receitaMes = eventosMes
      .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    const despesasMes = eventosMes
      .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    let lucroLiquido = receitaMes - despesasMes;

    // Aplicar desconto do salário da Brenda se ativo
    if (this.data.configuracoes.salarioBrenda.ativo) {
      const porcentagemBrenda =
        this.data.configuracoes.salarioBrenda.porcentagem;
      const salarioBrenda = (lucroLiquido * porcentagemBrenda) / 100;
      lucroLiquido -= salarioBrenda;
    }

    // Calcular total de vendas do mês (quantidade de itens)
    const totalVendasMes = eventosMes
      .filter(
        (e) =>
          ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(e.tipo) && e.produtos
      )
      .reduce((total, evento) => {
        return (
          total +
          evento.produtos.reduce(
            (subtotal, produto) => subtotal + produto.quantidade,
            0
          )
        );
      }, 0);

    // Atualizar métricas na interface
    const receitaElement = document.getElementById("receita-mes");
    const despesasElement = document.getElementById("despesas-mes");
    const lucroElement = document.getElementById("lucro-liquido");
    const clientesElement = document.getElementById("total-clientes");
    const vendasElement = document.getElementById("total-vendas-mes");

    if (receitaElement)
      receitaElement.textContent = this.formatCurrency(receitaMes);
    if (despesasElement)
      despesasElement.textContent = this.formatCurrency(despesasMes);
    if (lucroElement) {
      lucroElement.textContent = this.formatCurrency(lucroLiquido);
      lucroElement.className = `metric-value ${
        lucroLiquido >= 0 ? "status-positive" : "status-negative"
      }`;
    }
    if (clientesElement)
      clientesElement.textContent = this.data.clientes.length.toString();
    if (vendasElement)
      vendasElement.innerHTML = `${totalVendasMes} <span style="font-size: 0.7em; color: var(--color-text-secondary);">unidades</span>`;

    // Atualizar display do salário da Brenda
    this.updateSalarioBrendaDisplay();

    // Atualizar componentes do dashboard
    this.updateUltimasTransacoes();
    this.updateProdutosMaisVendidos();
    this.updateReceitasDespesasChart();
  }

  updateUltimasTransacoes() {
    const container = document.getElementById("ultimas-transacoes");
    if (!container) return;

    const ultimasTransacoes = this.data.eventos
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 5);

    if (ultimasTransacoes.length === 0) {
      container.innerHTML =
        '<p class="empty-state">Nenhuma transação registrada</p>';
      return;
    }

    container.innerHTML = ultimasTransacoes
      .map(
        (evento) => `
            <div class="summary-item">
                <span>${evento.descricao || evento.tipo}</span>
                <span class="${
                  (evento.valor || 0) >= 0
                    ? "status-positive"
                    : "status-negative"
                }">
                    ${this.formatCurrency(evento.valor || 0)}
                </span>
            </div>
        `
      )
      .join("");
  }

  updateProdutosMaisVendidos() {
    const container = document.getElementById("produtos-vendidos");
    if (!container) return;

    // Contar vendas por produto (incluindo BRINDES e VENDAS-IFOOD)
    const vendasProdutos = {};
    this.data.eventos
      .filter(
        (e) =>
          ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(e.tipo) && e.produtos
      )
      .forEach((evento) => {
        evento.produtos.forEach((produto) => {
          if (!vendasProdutos[produto.nome]) {
            vendasProdutos[produto.nome] = 0;
          }
          vendasProdutos[produto.nome] += produto.quantidade;
        });
      });

    const produtosOrdenados = Object.entries(vendasProdutos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (produtosOrdenados.length === 0) {
      container.innerHTML =
        '<p class="empty-state">Nenhum produto vendido ainda</p>';
      return;
    }

    container.innerHTML = produtosOrdenados
      .map(
        ([nome, quantidade]) => `
            <div class="summary-item">
                <span>${nome}</span>
                <span class="status-positive">${quantidade} vendidos</span>
            </div>
        `
      )
      .join("");
  }

  updateReceitasDespesasChart() {
    const ctx = document.getElementById("receitas-despesas-chart");
    if (!ctx) return;

    // Dados dos últimos 6 meses
    const meses = [];
    const receitas = [];
    const despesas = [];

    for (let i = 5; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);

      const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1);
      const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0);

      const eventosMes = this.data.eventos.filter((evento) => {
        const dataEvento = new Date(evento.data);
        return dataEvento >= inicioMes && dataEvento <= fimMes;
      });

      const receitaMes = eventosMes
        .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
        .reduce((total, e) => total + (e.valor || 0), 0);

      const despesaMes = eventosMes
        .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
        .reduce((total, e) => total + (e.valor || 0), 0);

      meses.push(
        data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      );
      receitas.push(receitaMes);
      despesas.push(despesaMes);
    }

    if (this.receitasDespesasChart) {
      this.receitasDespesasChart.destroy();
    }

    this.receitasDespesasChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Receitas",
            data: receitas,
            borderColor: "#1FB8CD",
            backgroundColor: "rgba(31, 184, 205, 0.1)",
            tension: 0.4,
          },
          {
            label: "Despesas",
            data: despesas,
            borderColor: "#B4413C",
            backgroundColor: "rgba(180, 65, 60, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value),
            },
          },
        },
      },
    });
  }

  // Visualização Híbrida do Estoque
  updateEstoqueVisualizacao() {
    const container = document.getElementById("estoque-cards");
    if (!container) return;

    container.innerHTML = "";

    if (this.data.produtos.length === 0) {
      container.innerHTML =
        '<p class="empty-state">Nenhum produto cadastrado</p>';
      return;
    }

    this.data.produtos.forEach((produto) => {
      const quantidadeAtual = this.data.estoqueAtual[produto.id] || 0;
      const maxQuantidade = Math.max(quantidadeAtual, 50); // Base para cálculo da barra
      const porcentagem = Math.min(
        (quantidadeAtual / maxQuantidade) * 100,
        100
      );

      const card = document.createElement("div");
      card.className = "estoque-item-card";

      card.innerHTML = `
                <div class="estoque-header">
                    <div class="estoque-nome">${produto.nome}</div>
                    <div class="estoque-quantidade">
                        ${quantidadeAtual}
                        <span class="estoque-unidade">unids</span>
                    </div>
                </div>
                <div class="estoque-barra-container">
                    <div class="estoque-barra-bg">
                        <div class="estoque-barra-fill ${
                          quantidadeAtual < 10 ? "baixo" : ""
                        }" 
                             style="width: ${porcentagem}%"></div>
                    </div>
                </div>
                <div class="estoque-controles">
                    <button class="estoque-btn" onclick="crm.ajustarEstoque('${
                      produto.id
                    }', -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="estoque-btn" onclick="crm.ajustarEstoque('${
                      produto.id
                    }', 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;

      container.appendChild(card);
    });
  }

  ajustarEstoque(produtoId, delta) {
    const quantidadeAtual = this.data.estoqueAtual[produtoId] || 0;
    const novaQuantidade = Math.max(0, quantidadeAtual + delta);

    // Se for incremento, criar um evento de entrada de estoque
    if (delta > 0) {
      const produto = this.data.produtos.find((p) => p.id === produtoId);
      if (produto) {
        const estoque = {
          id: this.generateId(),
          produtoId,
          produtoNome: produto.nome,
          quantidade: 1,
          data: new Date().toISOString().split("T")[0],
          valorEntradas: produto.valorFinal,
          valorDespesas: produto.custo,
          lucroProducao: produto.lucro,
        };
        this.data.estoque.push(estoque);
      }
    }

    // Se for decremento, criar um evento de ajuste (como uma venda interna)
    if (delta < 0 && quantidadeAtual > 0) {
      const produto = this.data.produtos.find((p) => p.id === produtoId);
      if (produto) {
        const evento = {
          id: this.generateId(),
          tipo: "OUTROS",
          data: new Date().toISOString().split("T")[0],
          categoria: "Ajuste de Estoque",
          valor: 0,
          descricao: `Ajuste manual: -1 ${produto.nome}`,
          produtos: [
            {
              produtoId: produto.id,
              nome: produto.nome,
              quantidade: 1,
              valorUnitario: produto.valorFinal,
            },
          ],
          timestamp: new Date().toISOString(),
        };
        this.data.eventos.push(evento);
      }
    }

    this.calculateEstoqueAtual();
    this.saveData();
    this.updateEstoqueTotalChart();
    this.updateEstoqueVisualizacao();
    this.updateEstoqueTable();
  }

  // Eventos Financeiros - Atualizado para novos tipos
  updateEventoFields() {
    const tipo = document.getElementById("evento-tipo").value;
    const vendasFields = document.getElementById("evento-vendas-fields");
    const outrosFields = document.getElementById("evento-outros-fields");
    const descontoField = document.getElementById("desconto-field");
    const categoriaSelect = document.getElementById("evento-categoria");

    // Mostrar campos apropriados baseado no tipo
    if (["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(tipo)) {
      vendasFields.style.display = "block";
      outrosFields.style.display = "none";

      // Campo de desconto apenas para VENDAS
      if (descontoField) {
        descontoField.style.display = tipo === "VENDAS" ? "block" : "none";
      }

      this.updateSubtotal();
    } else {
      vendasFields.style.display = "none";
      outrosFields.style.display = "block";

      // Atualizar categorias baseadas no tipo
      categoriaSelect.innerHTML = '<option value="">Selecione...</option>';
      const categorias =
        tipo === "ENTRADAS"
          ? this.categorias.receitas
          : this.categorias.despesas;
      categorias.forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
      });
    }
  }

  updateSubtotal() {
    const produtos = this.getProdutosVenda();
    const tipoEntrega = document.getElementById("evento-entrega").value;
    const bairroId = document.getElementById("evento-bairro").value;
    const desconto = parseFloat(
      document.getElementById("evento-desconto")?.value || 0
    );
    const tipoPagamento =
      document.getElementById("evento-pagamento")?.value || "";
    const taxaCartaoTipo =
      document.getElementById("taxa-cartao-tipo")?.value || "percentual";
    const taxaCartaoValor = parseFloat(
      document.getElementById("taxa-cartao-valor")?.value || 0
    );

    let subtotalProdutos = produtos.reduce((total, produto) => {
      return total + produto.valorUnitario * produto.quantidade;
    }, 0);

    // Aplicar desconto
    let valorDesconto = 0;
    if (desconto > 0) {
      valorDesconto = (subtotalProdutos * desconto) / 100;
      subtotalProdutos -= valorDesconto;
    }

    let taxaEntrega = 0;
    if (tipoEntrega === "entrega" && bairroId) {
      const bairro = this.data.bairros.find((b) => b.id === bairroId);
      if (bairro) {
        taxaEntrega = bairro.taxa;
      }
    }

    // Calcular taxa do cartão
    let taxaCartao = 0;
    if (tipoPagamento === "cartao" && taxaCartaoValor > 0) {
      if (taxaCartaoTipo === "percentual") {
        taxaCartao = (subtotalProdutos * taxaCartaoValor) / 100;
      } else {
        taxaCartao = taxaCartaoValor;
      }
    }

    const totalGeral = subtotalProdutos + taxaEntrega + taxaCartao;

    // Atualizar elementos na interface
    const subtotalElement = document.getElementById("subtotal-produtos");
    const valorDescontoElement = document.getElementById("valor-desconto");
    const descontoDisplayElement = document.getElementById("desconto-display");
    const taxaEntregaElement = document.getElementById("taxa-entrega-valor");
    const taxaCartaoElement = document.getElementById("valor-taxa-cartao");
    const taxaCartaoDisplayElement = document.getElementById(
      "taxa-cartao-display"
    );
    const totalGeralElement = document.getElementById("total-geral");
    const previewContainer = document.getElementById("subtotal-preview");

    if (subtotalElement)
      subtotalElement.textContent = this.formatCurrency(
        subtotalProdutos + valorDesconto
      );
    if (valorDescontoElement)
      valorDescontoElement.textContent = this.formatCurrency(valorDesconto);
    if (descontoDisplayElement)
      descontoDisplayElement.style.display =
        valorDesconto > 0 ? "flex" : "none";
    if (taxaEntregaElement)
      taxaEntregaElement.textContent = this.formatCurrency(taxaEntrega);
    if (taxaCartaoElement)
      taxaCartaoElement.textContent = this.formatCurrency(taxaCartao);
    if (taxaCartaoDisplayElement)
      taxaCartaoDisplayElement.style.display = taxaCartao > 0 ? "flex" : "none";
    if (totalGeralElement)
      totalGeralElement.textContent = this.formatCurrency(totalGeral);

    // Mostrar/ocultar preview baseado se há produtos
    if (previewContainer) {
      previewContainer.style.display = produtos.length > 0 ? "block" : "none";
    }
  }

  addEvento() {
    const tipo = document.getElementById("evento-tipo").value;
    const data = document.getElementById("evento-data").value;

    if (!tipo || !data) {
      alert("Tipo e data são obrigatórios.");
      return;
    }

    let evento = {
      id: this.generateId(),
      tipo,
      data,
      timestamp: new Date().toISOString(),
    };

    if (["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(tipo)) {
      const cliente = document.getElementById("evento-cliente").value;
      const tipoEntrega = document.getElementById("evento-entrega").value;
      const bairro = document.getElementById("evento-bairro").value;
      const produtos = this.getProdutosVenda();
      const desconto = parseFloat(
        document.getElementById("evento-desconto")?.value || 0
      );
      const tipoPagamento =
        document.getElementById("evento-pagamento")?.value || "pix";
      const taxaCartaoTipo =
        document.getElementById("taxa-cartao-tipo")?.value || "percentual";
      const taxaCartaoValor = parseFloat(
        document.getElementById("taxa-cartao-valor")?.value || 0
      );

      if (produtos.length === 0) {
        alert("Adicione pelo menos um produto.");
        return;
      }

      let valorTotal = produtos.reduce((total, produto) => {
        const produtoData = this.data.produtos.find(
          (p) => p.id === produto.produtoId
        );
        return (
          total +
          (produtoData ? produtoData.valorFinal * produto.quantidade : 0)
        );
      }, 0);

      // Aplicar desconto
      if (desconto > 0 && tipo === "VENDAS") {
        valorTotal = valorTotal - (valorTotal * desconto) / 100;
      }

      // Adicionar taxa de entrega se necessário
      if (tipoEntrega === "entrega" && bairro) {
        const bairroData = this.data.bairros.find((b) => b.id === bairro);
        if (bairroData) {
          valorTotal += bairroData.taxa;
        }
      }

      // Adicionar taxa do cartão se necessário
      if (tipoPagamento === "cartao" && taxaCartaoValor > 0) {
        if (taxaCartaoTipo === "percentual") {
          valorTotal += (valorTotal * taxaCartaoValor) / 100;
        } else {
          valorTotal += taxaCartaoValor;
        }
      }

      // Para BRINDES, permitir valor zero
      if (tipo === "BRINDES") {
        valorTotal = 0;
      }

      evento = {
        ...evento,
        cliente,
        tipoEntrega,
        bairro,
        produtos,
        valor: valorTotal,
        desconto: tipo === "VENDAS" ? desconto : 0,
        tipoPagamento,
        taxaCartao:
          tipoPagamento === "cartao"
            ? { tipo: taxaCartaoTipo, valor: taxaCartaoValor }
            : null,
        descricao: this.getEventoDescricao(tipo, produtos),
        // Para VENDAS-IFOOD, marcar como pendente
        status: tipo === "VENDAS-IFOOD" ? "pendente" : "concluido",
      };
    } else {
      const categoria = document.getElementById("evento-categoria").value;
      const valor = parseFloat(document.getElementById("evento-valor").value);
      const descricao = document
        .getElementById("evento-descricao")
        .value.trim();

      if (!categoria || isNaN(valor) || !descricao) {
        alert(
          "Categoria, valor e descrição são obrigatórios para este tipo de evento."
        );
        return;
      }

      evento = {
        ...evento,
        categoria,
        valor,
        descricao,
      };
    }

    this.data.eventos.push(evento);
    this.calculateEstoqueAtual(); // Recalcular estoque após evento
    this.saveData();
    this.updateEventosTable();
    this.updateEstoqueTotalChart();
    this.updateEstoqueVisualizacao();
    this.updateDashboard();

    document.getElementById("evento-form").reset();
    document.getElementById("evento-data").valueAsDate = new Date();
    document.getElementById("produtos-venda").innerHTML = "";
    this.updateEventoFields();
    alert("Evento registrado com sucesso!");
  }

  getEventoDescricao(tipo, produtos) {
    switch (tipo) {
      case "VENDAS":
        return `Venda: ${produtos
          .map((p) => `${p.quantidade}x ${p.nome}`)
          .join(", ")}`;
      case "BRINDES":
        return `Brinde: ${produtos
          .map((p) => `${p.quantidade}x ${p.nome}`)
          .join(", ")}`;
      case "VENDAS-IFOOD":
        return `iFood: ${produtos
          .map((p) => `${p.quantidade}x ${p.nome}`)
          .join(", ")} (30 dias)`;
      default:
        return "Evento";
    }
  }

  updateEventosTable() {
    const tbody = document.getElementById("eventos-table");
    if (!tbody) return;

    tbody.innerHTML = "";

    const eventosOrdenados = [...this.data.eventos].sort(
      (a, b) => new Date(b.data) - new Date(a.data)
    );

    eventosOrdenados.forEach((evento) => {
      let cliente = "";
      if (evento.cliente) {
        const clienteData = this.data.clientes.find(
          (c) => c.id === evento.cliente
        );
        cliente = clienteData ? clienteData.nome : "Cliente não encontrado";
      }

      let descricao = evento.descricao || evento.categoria || evento.tipo;
      if (
        ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(evento.tipo) &&
        evento.produtos
      ) {
        descricao = this.getEventoDescricao(evento.tipo, evento.produtos);
      }

      // Determinar classe do status
      let statusClass = "success";
      if (["DESPESAS", "IMPOSTOS", "OUTROS"].includes(evento.tipo)) {
        statusClass = "error";
      } else if (evento.tipo === "BRINDES") {
        statusClass = "warning";
      } else if (evento.tipo === "VENDAS-IFOOD") {
        statusClass = "info";
      }

      // Status display
      let statusText = "";
      if (evento.tipo === "VENDAS-IFOOD") {
        statusText = evento.status === "pendente" ? "Pendente 30d" : "Recebido";
      } else {
        statusText = "Concluído";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${this.formatDate(evento.data)}</td>
                <td><span class="status status--${statusClass}">${
        evento.tipo
      }</span></td>
                <td>${cliente || "-"}</td>
                <td>${descricao}</td>
                <td class="${
                  (evento.valor || 0) >= 0
                    ? "status-positive"
                    : "status-negative"
                }">${this.formatCurrency(evento.valor || 0)}</td>
                <td><span class="status status--${
                  evento.status === "pendente" ? "warning" : "success"
                }">${statusText}</span></td>
                <td>
                    <button class="action-btn action-btn--edit" onclick="crm.editEvento('${
                      evento.id
                    }')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${
                      evento.tipo === "VENDAS-IFOOD" &&
                      evento.status === "pendente"
                        ? `<button class="action-btn action-btn--edit" onclick="crm.marcarRecebidoIFood('${evento.id}')">
                            <i class="fas fa-check"></i>
                        </button>`
                        : ""
                    }
                    <button class="action-btn action-btn--delete" onclick="crm.deleteEvento('${
                      evento.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  marcarRecebidoIFood(eventoId) {
    const evento = this.data.eventos.find((e) => e.id === eventoId);
    if (evento && evento.tipo === "VENDAS-IFOOD") {
      evento.status = "recebido";
      // Adicionar ao lucro apenas quando recebido
      evento.dataRecebimento = new Date().toISOString();

      this.saveData();
      this.updateEventosTable();
      this.updateDashboard();
      alert("Venda iFood marcada como recebida!");
    }
  }

  // Metas - Atualizado com novas metas de vendas
  saveMetas() {
    // Metas de receita
    const receitaMensal =
      parseFloat(document.getElementById("meta-receita").value) || 0;
    const despesasMensais =
      parseFloat(document.getElementById("meta-despesas").value) || 0;
    const categoria = document.getElementById("meta-categoria").value;

    // Novas metas de vendas
    const vendasDiaria =
      parseInt(document.getElementById("meta-vendas-diaria").value) || 0;
    const vendasSemanal =
      parseInt(document.getElementById("meta-vendas-semanal").value) || 0;
    const vendasMensal =
      parseInt(document.getElementById("meta-vendas-mensal").value) || 0;

    this.data.metas = {
      receitaMensal,
      despesasMensais,
      categoria,
      vendas: {
        diaria: vendasDiaria,
        semanal: vendasSemanal,
        mensal: vendasMensal,
      },
    };

    this.saveData();
    this.updateMetasDisplay();
    alert("Metas salvas com sucesso!");
  }

  updateMetasDisplay() {
    // Carregar valores nos campos
    const metaReceita = document.getElementById("meta-receita");
    const metaDespesas = document.getElementById("meta-despesas");
    const metaCategoria = document.getElementById("meta-categoria");
    const metaVendasDiaria = document.getElementById("meta-vendas-diaria");
    const metaVendasSemanal = document.getElementById("meta-vendas-semanal");
    const metaVendasMensal = document.getElementById("meta-vendas-mensal");

    if (metaReceita) metaReceita.value = this.data.metas.receitaMensal || "";
    if (metaDespesas)
      metaDespesas.value = this.data.metas.despesasMensais || "";
    if (metaCategoria) metaCategoria.value = this.data.metas.categoria || "";
    if (metaVendasDiaria)
      metaVendasDiaria.value = this.data.metas.vendas?.diaria || "";
    if (metaVendasSemanal)
      metaVendasSemanal.value = this.data.metas.vendas?.semanal || "";
    if (metaVendasMensal)
      metaVendasMensal.value = this.data.metas.vendas?.mensal || "";

    // Atualizar barras de progresso de receita
    this.updateMetasReceitaProgress();

    // Atualizar barras de progresso de vendas
    this.updateMetasVendasProgress();
  }

  updateMetasReceitaProgress() {
    const mesAtual = this.getCurrentMonth();
    const eventosMes = this.data.eventos.filter((evento) => {
      const dataEvento = new Date(evento.data);
      return dataEvento >= mesAtual.start && dataEvento <= mesAtual.end;
    });

    const receitaAtual = eventosMes
      .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    const despesaAtual = eventosMes
      .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    // Progresso da receita
    const progressReceita = document.getElementById("progress-receita");
    const receitaAtualDisplay = document.getElementById("receita-atual");
    const metaReceitaDisplay = document.getElementById("meta-receita-display");

    if (progressReceita && this.data.metas.receitaMensal > 0) {
      const percentualReceita = Math.min(
        (receitaAtual / this.data.metas.receitaMensal) * 100,
        100
      );
      progressReceita.style.width = `${percentualReceita}%`;
    }

    if (receitaAtualDisplay)
      receitaAtualDisplay.textContent = this.formatCurrency(receitaAtual);
    if (metaReceitaDisplay)
      metaReceitaDisplay.textContent = this.formatCurrency(
        this.data.metas.receitaMensal || 0
      );

    // Progresso das despesas
    const progressDespesas = document.getElementById("progress-despesas");
    const despesaAtualDisplay = document.getElementById("despesas-atual");
    const limiteDespesasDisplay = document.getElementById(
      "limite-despesas-display"
    );

    if (progressDespesas && this.data.metas.despesasMensais > 0) {
      const percentualDespesas = Math.min(
        (despesaAtual / this.data.metas.despesasMensais) * 100,
        100
      );
      progressDespesas.style.width = `${percentualDespesas}%`;

      if (percentualDespesas > 80) {
        progressDespesas.classList.add("warning");
      } else {
        progressDespesas.classList.remove("warning");
      }
    }

    if (despesaAtualDisplay)
      despesaAtualDisplay.textContent = this.formatCurrency(despesaAtual);
    if (limiteDespesasDisplay)
      limiteDespesasDisplay.textContent = this.formatCurrency(
        this.data.metas.despesasMensais || 0
      );
  }

  updateMetasVendasProgress() {
    // Calcular vendas por período
    const hoje = this.getCurrentDay();
    const semanaAtual = this.getCurrentWeek();
    const mesAtual = this.getCurrentMonth();

    // Contar unidades vendidas (VENDAS, BRINDES, VENDAS-IFOOD)
    const vendasHoje = this.contarVendasPeriodo(hoje.start, hoje.end);
    const vendasSemana = this.contarVendasPeriodo(
      semanaAtual.start,
      semanaAtual.end
    );
    const vendasMes = this.contarVendasPeriodo(mesAtual.start, mesAtual.end);

    // Atualizar displays
    this.updateMetaVendasDisplay(
      "diaria",
      vendasHoje,
      this.data.metas.vendas?.diaria || 0
    );
    this.updateMetaVendasDisplay(
      "semanal",
      vendasSemana,
      this.data.metas.vendas?.semanal || 0
    );
    this.updateMetaVendasDisplay(
      "mensal",
      vendasMes,
      this.data.metas.vendas?.mensal || 0
    );
  }

  contarVendasPeriodo(inicio, fim) {
    return this.data.eventos
      .filter((evento) => {
        const dataEvento = new Date(evento.data);
        return (
          ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(evento.tipo) &&
          evento.produtos &&
          dataEvento >= inicio &&
          dataEvento < fim
        );
      })
      .reduce((total, evento) => {
        return (
          total +
          evento.produtos.reduce(
            (subtotal, produto) => subtotal + produto.quantidade,
            0
          )
        );
      }, 0);
  }

  updateMetaVendasDisplay(periodo, vendasAtuais, metaVendas) {
    const progressElement = document.getElementById(
      `progress-vendas-${periodo}`
    );
    const vendasAtualElement = document.getElementById(
      `vendas-${
        periodo === "diaria" ? "hoje" : periodo === "semanal" ? "semana" : "mes"
      }`
    );
    const metaDisplayElement = document.getElementById(
      `meta-vendas-${periodo}-display`
    );

    if (progressElement && metaVendas > 0) {
      const percentual = Math.min((vendasAtuais / metaVendas) * 100, 100);
      progressElement.style.width = `${percentual}%`;

      // Mudar cor se meta atingida
      if (percentual >= 100) {
        progressElement.style.backgroundColor = "var(--color-success)";
      } else if (percentual >= 80) {
        progressElement.style.backgroundColor = "var(--color-warning)";
      } else {
        progressElement.style.backgroundColor = "var(--color-primary)";
      }
    }

    if (vendasAtualElement) vendasAtualElement.textContent = vendasAtuais;
    if (metaDisplayElement) metaDisplayElement.textContent = metaVendas;
  }

  // Métodos existentes preservados (addCliente, updateClientesTable, etc.)
  addCliente() {
    const nome = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const endereco = document.getElementById("cliente-endereco").value.trim();
    const aniversario = document.getElementById("cliente-aniversario").value;
    const origem = document.getElementById("cliente-origem").value;
    const observacoes = document
      .getElementById("cliente-observacoes")
      .value.trim();

    if (!nome || !telefone) {
      alert("Nome e telefone são obrigatórios.");
      return;
    }

    // Verificar se está em modo de edição
    if (this.editingClienteId) {
      // Modo edição: atualizar cliente existente preservando ID e histórico
      const clienteIndex = this.data.clientes.findIndex(
        (c) => c.id === this.editingClienteId
      );

      if (clienteIndex !== -1) {
        // Preservar dados importantes do cliente original
        const clienteOriginal = this.data.clientes[clienteIndex];

        this.data.clientes[clienteIndex] = {
          ...clienteOriginal, // Preserva id, dataCadastro e outras propriedades
          nome,
          telefone,
          endereco,
          aniversario,
          origem,
          observacoes,
        };

        this.saveData();
        this.updateClientesTable();
        this.updateEventoSelects();

        // Resetar modo de edição
        this.editingClienteId = null;

        // Restaurar texto do botão e esconder cancelar
        const submitBtn = document.querySelector(
          "#cliente-form button[type='submit']"
        );
        const cancelBtn = document.getElementById("cancelar-edicao-cliente");

        if (submitBtn) {
          submitBtn.textContent = "Adicionar Cliente";
        }

        if (cancelBtn) {
          cancelBtn.classList.add("hidden");
        }

        document.getElementById("cliente-form").reset();
        alert("Cliente atualizado com sucesso!");
        return;
      }
    }

    // Modo adição: criar novo cliente
    const cliente = {
      id: this.generateId(),
      nome,
      telefone,
      endereco,
      aniversario,
      origem,
      observacoes,
      dataCadastro: new Date().toISOString(),
      totalGasto: 0,
      totalCompras: 0,
      ultimaCompra: null,
    };

    this.data.clientes.push(cliente);
    this.saveData();
    this.updateClientesTable();
    this.updateEventoSelects();

    document.getElementById("cliente-form").reset();
    alert("Cliente adicionado com sucesso!");
  }

  updateClientesTable() {
    const tbody = document.getElementById("clientes-table");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Ordenar clientes alfabeticamente por nome
    const clientesOrdenados = [...this.data.clientes].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    clientesOrdenados.forEach((cliente) => {
      // Calcular estatísticas do cliente
      const comprasCliente = this.data.eventos.filter(
        (e) => e.tipo === "VENDAS" && e.cliente === cliente.id
      );

      const totalGasto = comprasCliente.reduce(
        (total, compra) => total + (compra.valor || 0),
        0
      );
      const ultimaCompra =
        comprasCliente.length > 0
          ? Math.max(...comprasCliente.map((c) => new Date(c.data).getTime()))
          : null;

      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.telefone}</td>
                <td>${cliente.origem || "-"}</td>
                <td>${this.formatCurrency(totalGasto)}</td>
                <td>${
                  ultimaCompra ? this.formatDate(ultimaCompra) : "Nunca"
                }</td>
                <td>
                    <button class="action-btn action-btn--view" onclick="crm.viewClienteDetalhes('${
                      cliente.id
                    }')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn action-btn--edit" onclick="crm.editCliente('${
                      cliente.id
                    }')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn action-btn--delete" onclick="crm.deleteCliente('${
                      cliente.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  filterClientes(searchTerm) {
    const tbody = document.getElementById("clientes-table");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const nome = row.cells[0].textContent.toLowerCase();
      const telefone = row.cells[1].textContent.toLowerCase();
      const shouldShow =
        nome.includes(searchTerm.toLowerCase()) ||
        telefone.includes(searchTerm.toLowerCase());
      row.style.display = shouldShow ? "" : "none";
    });
  }

  viewClienteDetalhes(clienteId) {
    const cliente = this.data.clientes.find((c) => c.id === clienteId);
    if (!cliente) return;

    const comprasCliente = this.data.eventos.filter(
      (e) => e.tipo === "VENDAS" && e.cliente === clienteId
    );

    const totalGasto = comprasCliente.reduce(
      (total, compra) => total + (compra.valor || 0),
      0
    );
    const ticketMedio =
      comprasCliente.length > 0 ? totalGasto / comprasCliente.length : 0;

    // Produtos favoritos
    const produtosFavoritos = {};
    comprasCliente.forEach((compra) => {
      if (compra.produtos) {
        compra.produtos.forEach((produto) => {
          if (!produtosFavoritos[produto.nome]) {
            produtosFavoritos[produto.nome] = 0;
          }
          produtosFavoritos[produto.nome] += produto.quantidade;
        });
      }
    });

    const produtoFavorito = Object.entries(produtosFavoritos).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const modal = document.getElementById("cliente-modal");
    const title = document.getElementById("cliente-modal-title");
    const body = document.getElementById("cliente-modal-body");

    title.textContent = `Detalhes - ${cliente.nome}`;

    body.innerHTML = `
            <div class="cliente-detalhes">
                <div class="cliente-info">
                    <h4>Informações Básicas</h4>
                    <p><strong>Nome:</strong> ${cliente.nome}</p>
                    <p><strong>Telefone:</strong> ${cliente.telefone}</p>
                    <p><strong>Endereço:</strong> ${
                      cliente.endereco || "Não informado"
                    }</p>
                    <p><strong>Aniversário:</strong> ${
                      cliente.aniversario
                        ? this.formatDate(cliente.aniversario)
                        : "Não informado"
                    }</p>
                    <p><strong>Origem:</strong> ${
                      cliente.origem || "Não informado"
                    }</p>
                    <p><strong>Data de Cadastro:</strong> ${this.formatDate(
                      cliente.dataCadastro
                    )}</p>
                </div>
                
                <div class="cliente-stats">
                    <h4>Estatísticas</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${
                              comprasCliente.length
                            }</div>
                            <div class="stat-label">Total de Compras</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${this.formatCurrency(
                              totalGasto
                            )}</div>
                            <div class="stat-label">Total Gasto</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${this.formatCurrency(
                              ticketMedio
                            )}</div>
                            <div class="stat-label">Ticket Médio</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${
                              produtoFavorito ? produtoFavorito[0] : "Nenhum"
                            }</div>
                            <div class="stat-label">Produto Favorito</div>
                        </div>
                    </div>
                </div>
                
                <div class="cliente-historico">
                    <h4>Últimas Compras</h4>
                    ${
                      comprasCliente.length === 0
                        ? '<p class="empty-state">Nenhuma compra registrada</p>'
                        : comprasCliente
                            .slice(-5)
                            .reverse()
                            .map(
                              (compra) => `
                            <div class="compra-item">
                                <div class="compra-data">${this.formatDate(
                                  compra.data
                                )}</div>
                                <div class="compra-valor">${this.formatCurrency(
                                  compra.valor || 0
                                )}</div>
                                <div class="compra-descricao">${
                                  compra.descricao || "Venda"
                                }</div>
                            </div>
                        `
                            )
                            .join("")
                    }
                </div>
            </div>
        `;

    modal.classList.add("active");
  }

  editCliente(clienteId) {
    const cliente = this.data.clientes.find((c) => c.id === clienteId);
    if (!cliente) return;

    // Preencher formulário com dados do cliente
    document.getElementById("cliente-nome").value = cliente.nome;
    document.getElementById("cliente-telefone").value = cliente.telefone;
    document.getElementById("cliente-endereco").value = cliente.endereco || "";
    document.getElementById("cliente-aniversario").value =
      cliente.aniversario || "";
    document.getElementById("cliente-origem").value = cliente.origem || "";
    document.getElementById("cliente-observacoes").value =
      cliente.observacoes || "";

    // Definir modo de edição para preservar o ID e histórico
    this.editingClienteId = clienteId;

    // Atualizar texto do botão para indicar edição
    const submitBtn = document.querySelector(
      "#cliente-form button[type='submit']"
    );
    const cancelBtn = document.getElementById("cancelar-edicao-cliente");

    if (submitBtn) {
      submitBtn.textContent = "Atualizar Cliente";
    }

    if (cancelBtn) {
      cancelBtn.classList.remove("hidden");
    }
  }

  cancelarEdicaoCliente() {
    // Resetar modo de edição
    this.editingClienteId = null;

    // Restaurar texto do botão e esconder cancelar
    const submitBtn = document.querySelector(
      "#cliente-form button[type='submit']"
    );
    const cancelBtn = document.getElementById("cancelar-edicao-cliente");

    if (submitBtn) {
      submitBtn.textContent = "Adicionar Cliente";
    }

    if (cancelBtn) {
      cancelBtn.classList.add("hidden");
    }

    // Limpar formulário
    document.getElementById("cliente-form").reset();
  }

  deleteCliente(clienteId, showConfirm = true) {
    if (showConfirm) {
      this.showConfirmModal(
        "Excluir Cliente",
        "Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.",
        () => {
          this.data.clientes = this.data.clientes.filter(
            (c) => c.id !== clienteId
          );
          this.saveData();
          this.updateClientesTable();
          this.updateEventoSelects();
        }
      );
    } else {
      this.data.clientes = this.data.clientes.filter((c) => c.id !== clienteId);
      this.saveData();
      this.updateClientesTable();
      this.updateEventoSelects();
    }
  }

  // Produtos
  addProduto() {
    const nome = document.getElementById("produto-nome").value.trim();
    const custo = parseFloat(document.getElementById("produto-custo").value);
    const lucro = parseFloat(document.getElementById("produto-lucro").value);

    if (!nome || isNaN(custo) || isNaN(lucro)) {
      alert("Todos os campos são obrigatórios e devem ser válidos.");
      return;
    }

    // Verificar se está em modo de edição
    if (this.editingProdutoId) {
      // Modo edição: atualizar produto existente preservando ID e vínculos
      const produtoIndex = this.data.produtos.findIndex(
        (p) => p.id === this.editingProdutoId
      );

      if (produtoIndex !== -1) {
        // Preservar dados importantes do produto original
        const produtoOriginal = this.data.produtos[produtoIndex];

        this.data.produtos[produtoIndex] = {
          ...produtoOriginal, // Preserva id e outras propriedades
          nome,
          custo,
          lucro,
          valorFinal: custo + lucro,
          margem: ((lucro / (custo + lucro)) * 100).toFixed(1),
        };

        this.saveData();
        this.updateProdutosTable();
        this.updateEstoqueProdutoSelect();
        this.updateEventoSelects();
        this.updateEstoqueTotalChart();
        this.updateEstoqueVisualizacao();

        // Resetar modo de edição
        this.editingProdutoId = null;

        // Restaurar texto do botão e esconder cancelar
        const submitBtn = document.querySelector(
          "#produto-form button[type='submit']"
        );
        const cancelBtn = document.getElementById("cancelar-edicao-produto");

        if (submitBtn) {
          submitBtn.textContent = "Adicionar Produto";
        }

        if (cancelBtn) {
          cancelBtn.classList.add("hidden");
        }

        document.getElementById("produto-form").reset();
        document.getElementById("produto-valor-final").value = "";
        alert("Produto atualizado com sucesso!");
        return;
      }
    }

    // Modo adição: criar novo produto
    const produto = {
      id: this.generateId(),
      nome,
      custo,
      lucro,
      valorFinal: custo + lucro,
      margem: ((lucro / (custo + lucro)) * 100).toFixed(1),
    };

    this.data.produtos.push(produto);
    this.saveData();
    this.updateProdutosTable();
    this.updateEstoqueProdutoSelect();
    this.updateEventoSelects();
    this.updateEstoqueTotalChart();
    this.updateEstoqueVisualizacao();

    document.getElementById("produto-form").reset();
    document.getElementById("produto-valor-final").value = "";
    alert("Produto adicionado com sucesso!");
  }

  updateProdutosTable() {
    const tbody = document.getElementById("produtos-table");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Ordenar produtos alfabeticamente por nome
    const produtosOrdenados = [...this.data.produtos].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    produtosOrdenados.forEach((produto) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${produto.nome}</td>
                <td>${this.formatCurrency(produto.custo)}</td>
                <td>${this.formatCurrency(produto.lucro)}</td>
                <td>${this.formatCurrency(produto.valorFinal)}</td>
                <td>${produto.margem}%</td>
                <td>
                    <button class="action-btn action-btn--edit" onclick="crm.editProduto('${
                      produto.id
                    }')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn action-btn--delete" onclick="crm.deleteProduto('${
                      produto.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  filterProdutos(searchTerm) {
    const tbody = document.getElementById("produtos-table");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const nome = row.cells[0].textContent.toLowerCase();
      const shouldShow = nome.includes(searchTerm.toLowerCase());
      row.style.display = shouldShow ? "" : "none";
    });
  }

  editProduto(produtoId) {
    const produto = this.data.produtos.find((p) => p.id === produtoId);
    if (!produto) return;

    // Preencher formulário com dados do produto
    document.getElementById("produto-nome").value = produto.nome;
    document.getElementById("produto-custo").value = produto.custo;
    document.getElementById("produto-lucro").value = produto.lucro;
    document.getElementById("produto-valor-final").value = this.formatCurrency(
      produto.valorFinal
    );

    // Definir modo de edição para preservar o ID e vínculos
    this.editingProdutoId = produtoId;

    // Atualizar texto do botão para indicar edição
    const submitBtn = document.querySelector(
      "#produto-form button[type='submit']"
    );
    const cancelBtn = document.getElementById("cancelar-edicao-produto");

    if (submitBtn) {
      submitBtn.textContent = "Atualizar Produto";
    }

    if (cancelBtn) {
      cancelBtn.classList.remove("hidden");
    }
  }

  cancelarEdicaoProduto() {
    // Resetar modo de edição
    this.editingProdutoId = null;

    // Restaurar texto do botão e esconder cancelar
    const submitBtn = document.querySelector(
      "#produto-form button[type='submit']"
    );
    const cancelBtn = document.getElementById("cancelar-edicao-produto");

    if (submitBtn) {
      submitBtn.textContent = "Adicionar Produto";
    }

    if (cancelBtn) {
      cancelBtn.classList.add("hidden");
    }

    // Limpar formulário
    document.getElementById("produto-form").reset();
    document.getElementById("produto-valor-final").value = "";
  }

  deleteProduto(produtoId, showConfirm = true) {
    if (showConfirm) {
      this.showConfirmModal(
        "Excluir Produto",
        "Tem certeza que deseja excluir este produto?",
        () => {
          this.data.produtos = this.data.produtos.filter(
            (p) => p.id !== produtoId
          );
          this.saveData();
          this.updateProdutosTable();
          this.updateEstoqueProdutoSelect();
          this.updateEventoSelects();
          this.updateEstoqueTotalChart();
          this.updateEstoqueVisualizacao();
        }
      );
    } else {
      this.data.produtos = this.data.produtos.filter((p) => p.id !== produtoId);
      this.saveData();
      this.updateProdutosTable();
      this.updateEstoqueProdutoSelect();
      this.updateEventoSelects();
      this.updateEstoqueTotalChart();
      this.updateEstoqueVisualizacao();
    }
  }

  // [Continuar com os métodos restantes...]
  // Bairros e Taxa de Entrega
  addBairro() {
    const nome = document.getElementById("bairro-nome").value.trim();
    const valor = parseFloat(document.getElementById("bairro-valor").value);

    if (!nome || isNaN(valor)) {
      alert("Nome e valor são obrigatórios.");
      return;
    }

    const bairro = {
      id: this.generateId(),
      nome,
      taxa: valor,
    };

    this.data.bairros.push(bairro);
    this.saveData();
    this.updateBairrosTable();
    this.updateEventoSelects();

    document.getElementById("bairro-form").reset();
    alert("Bairro adicionado com sucesso!");
  }

  updateBairrosTable() {
    const tbody = document.getElementById("bairros-table");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Ordenar bairros alfabeticamente por nome
    const bairrosOrdenados = [...this.data.bairros].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    bairrosOrdenados.forEach((bairro) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${bairro.nome}</td>
                <td>${this.formatCurrency(bairro.taxa)}</td>
                <td>
                    <button class="action-btn action-btn--edit" onclick="crm.editBairro('${
                      bairro.id
                    }')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn action-btn--delete" onclick="crm.deleteBairro('${
                      bairro.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  filterBairros(searchTerm) {
    const tbody = document.getElementById("bairros-table");
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const nome = row.cells[0].textContent.toLowerCase();
      const shouldShow = nome.includes(searchTerm.toLowerCase());
      row.style.display = shouldShow ? "" : "none";
    });
  }

  editBairro(bairroId) {
    const bairro = this.data.bairros.find((b) => b.id === bairroId);
    if (!bairro) return;

    document.getElementById("bairro-nome").value = bairro.nome;
    document.getElementById("bairro-valor").value = bairro.taxa;

    this.deleteBairro(bairroId, false);
  }

  deleteBairro(bairroId, showConfirm = true) {
    if (showConfirm) {
      this.showConfirmModal(
        "Excluir Bairro",
        "Tem certeza que deseja excluir este bairro?",
        () => {
          this.data.bairros = this.data.bairros.filter(
            (b) => b.id !== bairroId
          );
          this.saveData();
          this.updateBairrosTable();
          this.updateEventoSelects();
        }
      );
    } else {
      this.data.bairros = this.data.bairros.filter((b) => b.id !== bairroId);
      this.saveData();
      this.updateBairrosTable();
      this.updateEventoSelects();
    }
  }

  // Estoque
  addEstoque() {
    const produtoId = document.getElementById("estoque-produto").value;
    const quantidade = parseInt(
      document.getElementById("estoque-quantidade").value
    );
    const data = document.getElementById("estoque-data").value;

    if (!produtoId || !quantidade || !data) {
      alert("Todos os campos são obrigatórios.");
      return;
    }

    const produto = this.data.produtos.find((p) => p.id === produtoId);
    if (!produto) {
      alert("Produto não encontrado.");
      return;
    }

    const valorEntradas = quantidade * produto.valorFinal;
    const valorDespesas = quantidade * produto.custo;
    const lucroProducao = valorEntradas - valorDespesas;

    const estoque = {
      id: this.generateId(),
      produtoId,
      produtoNome: produto.nome,
      quantidade,
      data,
      valorEntradas,
      valorDespesas,
      lucroProducao,
    };

    this.data.estoque.push(estoque);
    this.calculateEstoqueAtual();
    this.saveData();
    this.updateEstoqueTotalChart();
    this.updateEstoqueVisualizacao();
    this.updateEstoqueTable();

    document.getElementById("estoque-form").reset();
    document.getElementById("estoque-data").valueAsDate = new Date();
    document.getElementById("estoque-preview").style.display = "none";
    alert("Produção registrada com sucesso!");
  }

  updateEstoquePreview() {
    const produtoId = document.getElementById("estoque-produto").value;
    const quantidade = parseInt(
      document.getElementById("estoque-quantidade").value
    );

    if (!produtoId || !quantidade) {
      document.getElementById("estoque-preview").style.display = "none";
      return;
    }

    const produto = this.data.produtos.find((p) => p.id === produtoId);
    if (!produto) return;

    const valorEntradas = quantidade * produto.valorFinal;
    const valorDespesas = quantidade * produto.custo;
    const lucroProducao = valorEntradas - valorDespesas;

    document.getElementById("valor-entradas").textContent =
      this.formatCurrency(valorEntradas);
    document.getElementById("valor-despesas").textContent =
      this.formatCurrency(valorDespesas);
    document.getElementById("lucro-producao").textContent =
      this.formatCurrency(lucroProducao);
    document.getElementById("estoque-preview").style.display = "block";
  }

  updateEstoqueProdutoSelect() {
    const select = document.getElementById("estoque-produto");
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um produto...</option>';

    // Ordenar produtos alfabeticamente por nome
    const produtosOrdenados = [...this.data.produtos].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    produtosOrdenados.forEach((produto) => {
      const option = document.createElement("option");
      option.value = produto.id;
      option.textContent = produto.nome;
      select.appendChild(option);
    });
  }

  updateEstoqueTable() {
    const tbody = document.getElementById("estoque-table");
    if (!tbody) return;

    tbody.innerHTML = "";

    const estoqueOrdenado = [...this.data.estoque].sort(
      (a, b) => new Date(b.data) - new Date(a.data)
    );

    estoqueOrdenado.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${this.formatDate(item.data)}</td>
                <td>${item.produtoNome}</td>
                <td>${item.quantidade}</td>
                <td>${this.formatCurrency(item.valorEntradas)}</td>
                <td>${this.formatCurrency(item.valorDespesas)}</td>
                <td class="${
                  item.lucroProducao >= 0
                    ? "status-positive"
                    : "status-negative"
                }">${this.formatCurrency(item.lucroProducao)}</td>
                <td>
                    <button class="action-btn action-btn--delete" onclick="crm.deleteEstoque('${
                      item.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  deleteEstoque(estoqueId) {
    this.showConfirmModal(
      "Excluir Produção",
      "Tem certeza que deseja excluir este registro de produção?",
      () => {
        this.data.estoque = this.data.estoque.filter((e) => e.id !== estoqueId);
        this.calculateEstoqueAtual();
        this.saveData();
        this.updateEstoqueTotalChart();
        this.updateEstoqueVisualizacao();
        this.updateEstoqueTable();
      }
    );
  }

  toggleBairroField() {
    const tipoEntrega = document.getElementById("evento-entrega").value;
    const bairroField = document.getElementById("bairro-entrega");

    bairroField.style.display = tipoEntrega === "entrega" ? "block" : "none";
    this.updateSubtotal();
  }

  toggleTaxaCartaoField() {
    const tipoPagamento = document.getElementById("evento-pagamento").value;
    const taxaCartaoField = document.getElementById("taxa-cartao-field");

    taxaCartaoField.style.display =
      tipoPagamento === "cartao" ? "block" : "none";
    this.updateSubtotal();
  }

  addProdutoVenda() {
    const container = document.getElementById("produtos-venda");
    const div = document.createElement("div");
    div.className = "produto-venda-item";

    const uniqueId = this.generateId();

    div.innerHTML = `
            <div class="select-with-search">
                <input type="text" class="form-control produto-search" id="produto-search-${uniqueId}" placeholder="Digite para buscar produto...">
                <select class="form-control produto-select" id="produto-select-${uniqueId}" size="4" style="display: none;" required>
                    <option value="">Selecione um produto...</option>
                </select>
            </div>
            <input type="number" class="form-control quantidade-input" placeholder="Quantidade" min="1" required>
            <button type="button" class="btn btn--secondary remove-produto-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;

    container.appendChild(div);

    // Setup da busca de produtos para este item
    this.setupProdutoSearch(uniqueId);

    const removeBtn = div.querySelector(".remove-produto-btn");
    removeBtn.addEventListener("click", () => {
      div.remove();
      this.updateSubtotal();
    });

    // Adicionar event listeners para recálculo do subtotal
    const produtoSelect = div.querySelector(".produto-select");
    const quantidadeInput = div.querySelector(".quantidade-input");

    [produtoSelect, quantidadeInput].forEach((input) => {
      input.addEventListener("change", () => this.updateSubtotal());
      input.addEventListener("input", () => this.updateSubtotal());
    });

    this.updateSubtotal();
  }

  setupProdutoSearch(uniqueId) {
    const produtoSearch = document.getElementById(`produto-search-${uniqueId}`);
    const produtoSelect = document.getElementById(`produto-select-${uniqueId}`);

    if (!produtoSearch || !produtoSelect) return;

    // Ordenar produtos alfabeticamente
    const produtosOrdenados = [...this.data.produtos].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    // Função para popular o select
    const populateProdutos = (filtro = "") => {
      produtoSelect.innerHTML =
        '<option value="">Selecione um produto...</option>';

      const produtosFiltrados = produtosOrdenados.filter((produto) =>
        produto.nome.toLowerCase().includes(filtro.toLowerCase())
      );

      produtosFiltrados.forEach((produto) => {
        const option = document.createElement("option");
        option.value = produto.id;
        option.textContent = `${produto.nome} - ${this.formatCurrency(
          produto.valorFinal
        )}`;
        produtoSelect.appendChild(option);
      });
    };

    // Popular inicialmente
    populateProdutos();

    // Event listeners
    produtoSearch.addEventListener("input", (e) => {
      const filtro = e.target.value;
      populateProdutos(filtro);
      produtoSelect.style.display = filtro ? "block" : "none";
    });

    produtoSearch.addEventListener("focus", () => {
      produtoSelect.style.display = "block";
    });

    produtoSelect.addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        produtoSearch.value = selectedOption.textContent;
        produtoSelect.style.display = "none";
        this.updateSubtotal();
      }
    });

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      if (
        !produtoSearch.contains(e.target) &&
        !produtoSelect.contains(e.target)
      ) {
        produtoSelect.style.display = "none";
      }
    });
  }

  getProdutosVenda() {
    const items = document.querySelectorAll(".produto-venda-item");
    const produtos = [];

    items.forEach((item) => {
      const produtoId = item.querySelector(".produto-select").value;
      const quantidade = parseInt(
        item.querySelector(".quantidade-input").value
      );

      if (produtoId && quantidade > 0) {
        const produto = this.data.produtos.find((p) => p.id === produtoId);
        if (produto) {
          produtos.push({
            produtoId,
            nome: produto.nome,
            quantidade,
            valorUnitario: produto.valorFinal,
          });
        }
      }
    });

    return produtos;
  }

  updateEventoSelects() {
    // Atualizar select de clientes com busca
    this.setupClienteSearch();

    // Atualizar select de bairros com busca
    this.setupBairroSearch();
  }

  setupClienteSearch() {
    const clienteSearch = document.getElementById("evento-cliente-search");
    const clienteSelect = document.getElementById("evento-cliente");

    if (!clienteSearch || !clienteSelect) return;

    // Ordenar clientes alfabeticamente
    const clientesOrdenados = [...this.data.clientes].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    // Função para popular o select
    const populateClientes = (filtro = "") => {
      clienteSelect.innerHTML =
        '<option value="">Selecione um cliente...</option>';

      const clientesFiltrados = clientesOrdenados.filter((cliente) =>
        cliente.nome.toLowerCase().includes(filtro.toLowerCase())
      );

      clientesFiltrados.forEach((cliente) => {
        const option = document.createElement("option");
        option.value = cliente.id;
        option.textContent = cliente.nome;
        clienteSelect.appendChild(option);
      });
    };

    // Popular inicialmente
    populateClientes();

    // Event listeners
    clienteSearch.addEventListener("input", (e) => {
      const filtro = e.target.value;
      populateClientes(filtro);
      clienteSelect.style.display = filtro ? "block" : "none";
    });

    clienteSearch.addEventListener("focus", () => {
      clienteSelect.style.display = "block";
    });

    clienteSelect.addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        clienteSearch.value = selectedOption.textContent;
        clienteSelect.style.display = "none";
      }
    });

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      if (
        !clienteSearch.contains(e.target) &&
        !clienteSelect.contains(e.target)
      ) {
        clienteSelect.style.display = "none";
      }
    });
  }

  setupBairroSearch() {
    const bairroSearch = document.getElementById("evento-bairro-search");
    const bairroSelect = document.getElementById("evento-bairro");

    if (!bairroSearch || !bairroSelect) return;

    // Ordenar bairros alfabeticamente
    const bairrosOrdenados = [...this.data.bairros].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    // Função para popular o select
    const populateBairros = (filtro = "") => {
      bairroSelect.innerHTML =
        '<option value="">Selecione um bairro...</option>';

      const bairrosFiltrados = bairrosOrdenados.filter((bairro) =>
        bairro.nome.toLowerCase().includes(filtro.toLowerCase())
      );

      bairrosFiltrados.forEach((bairro) => {
        const option = document.createElement("option");
        option.value = bairro.id;
        option.textContent = `${bairro.nome} - ${this.formatCurrency(
          bairro.taxa
        )}`;
        bairroSelect.appendChild(option);
      });
    };

    // Popular inicialmente
    populateBairros();

    // Event listeners
    bairroSearch.addEventListener("input", (e) => {
      const filtro = e.target.value;
      populateBairros(filtro);
      bairroSelect.style.display = filtro ? "block" : "none";
    });

    bairroSearch.addEventListener("focus", () => {
      bairroSelect.style.display = "block";
    });

    bairroSelect.addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        bairroSearch.value = selectedOption.textContent;
        bairroSelect.style.display = "none";
        this.updateSubtotal();
      }
    });

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      if (
        !bairroSearch.contains(e.target) &&
        !bairroSelect.contains(e.target)
      ) {
        bairroSelect.style.display = "none";
      }
    });
  }

  aplicarFiltrosEventos() {
    const tbody = document.getElementById("eventos-table");
    if (!tbody) return;

    const pesquisa =
      document.getElementById("pesquisa-eventos")?.value.toLowerCase() || "";
    const tipoFiltro =
      document.getElementById("filtro-evento-tipo")?.value || "";
    const dataInicio =
      document.getElementById("filtro-data-inicio")?.value || "";
    const dataFim = document.getElementById("filtro-data-fim")?.value || "";

    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.cells;
      if (!cells || cells.length === 0) return;

      const data = cells[0].textContent;
      const tipo = cells[1].textContent;
      const cliente = cells[2].textContent.toLowerCase();
      const descricao = cells[3].textContent.toLowerCase();

      // Filtro por pesquisa (busca em cliente e descrição)
      const matchPesquisa =
        !pesquisa || cliente.includes(pesquisa) || descricao.includes(pesquisa);

      // Filtro por tipo
      const matchTipo = !tipoFiltro || tipo.includes(tipoFiltro);

      // Filtro por data
      let matchData = true;
      if (dataInicio || dataFim) {
        const eventoData = new Date(data.split("/").reverse().join("-")); // Converte DD/MM/YYYY para YYYY-MM-DD

        if (dataInicio) {
          const inicio = new Date(dataInicio);
          matchData = matchData && eventoData >= inicio;
        }

        if (dataFim) {
          const fim = new Date(dataFim);
          matchData = matchData && eventoData <= fim;
        }
      }

      // Mostra a linha apenas se todos os filtros passarem
      const shouldShow = matchPesquisa && matchTipo && matchData;
      row.style.display = shouldShow ? "" : "none";
    });
  }

  limparFiltrosEventos() {
    // Limpar todos os campos de filtro
    const pesquisaEventos = document.getElementById("pesquisa-eventos");
    const filtroTipo = document.getElementById("filtro-evento-tipo");
    const filtroDataInicio = document.getElementById("filtro-data-inicio");
    const filtroDataFim = document.getElementById("filtro-data-fim");

    if (pesquisaEventos) pesquisaEventos.value = "";
    if (filtroTipo) filtroTipo.value = "";
    if (filtroDataInicio) filtroDataInicio.value = "";
    if (filtroDataFim) filtroDataFim.value = "";

    // Aplicar filtros (que agora estão vazios, mostrando todos os eventos)
    this.aplicarFiltrosEventos();
  }

  // Manter compatibilidade com código antigo
  filterEventos(tipoFiltro) {
    const filtroTipo = document.getElementById("filtro-evento-tipo");
    if (filtroTipo) {
      filtroTipo.value = tipoFiltro || "";
    }
    this.aplicarFiltrosEventos();
  }

  editEvento(eventoId) {
    const evento = this.data.eventos.find((e) => e.id === eventoId);
    if (!evento) {
      alert("Evento não encontrado!");
      return;
    }

    // Preencher o formulário com os dados do evento
    document.getElementById("edit-evento-tipo").value = evento.tipo;
    document.getElementById("edit-evento-data").value =
      evento.data.split("T")[0]; // Para input type="date"
    document.getElementById("edit-evento-valor").value = Math.abs(
      evento.valor || 0
    );
    document.getElementById("edit-evento-descricao").value =
      evento.descricao || "";

    // Atualizar categorias baseado no tipo
    this.updateEditEventoCategorias();

    // Definir categoria se existir
    if (evento.categoria) {
      document.getElementById("edit-evento-categoria").value = evento.categoria;
    }

    // Armazenar o ID do evento sendo editado
    this.currentEditingEventoId = eventoId;

    // Abrir modal
    document.getElementById("edit-evento-modal").classList.add("active");
  }

  updateEditEventoCategorias() {
    const tipo = document.getElementById("edit-evento-tipo").value;
    const categoriaSelect = document.getElementById("edit-evento-categoria");

    // Limpar opções existentes
    categoriaSelect.innerHTML =
      '<option value="">Selecione uma categoria</option>';

    let categorias = [];

    switch (tipo) {
      case "ENTRADAS":
        categorias = ["Vendas", "Encomendas", "Pronta Entrega", "Extras"];
        break;
      case "DESPESAS":
      case "IMPOSTOS":
      case "OUTROS":
        categorias = [
          "Ingredientes",
          "Embalagens",
          "Combustível",
          "Marketing",
          "2R/Motoqueiro",
          "Aluguel",
          "Salário",
          "Luz",
          "Água",
          "Outros",
        ];
        break;
      default:
        // Para VENDAS, BRINDES, VENDAS-IFOOD não há categorias específicas
        break;
    }

    categorias.forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria;
      categoriaSelect.appendChild(option);
    });
  }

  updateEvento() {
    if (!this.currentEditingEventoId) {
      alert("Erro: Nenhum evento sendo editado!");
      return;
    }

    const evento = this.data.eventos.find(
      (e) => e.id === this.currentEditingEventoId
    );
    if (!evento) {
      alert("Evento não encontrado!");
      return;
    }

    // Capturar dados do formulário
    const tipo = document.getElementById("edit-evento-tipo").value;
    const data = document.getElementById("edit-evento-data").value;
    const valor = parseFloat(
      document.getElementById("edit-evento-valor").value
    );
    const categoria = document.getElementById("edit-evento-categoria").value;
    const descricao = document.getElementById("edit-evento-descricao").value;

    // Validações
    if (!tipo || !data || isNaN(valor)) {
      alert("Por favor, preencha todos os campos obrigatórios!");
      return;
    }

    // Atualizar evento
    evento.tipo = tipo;
    evento.data = data;
    evento.categoria = categoria;
    evento.descricao = descricao;

    // Definir valor baseado no tipo (positivo ou negativo)
    if (["DESPESAS", "IMPOSTOS", "OUTROS"].includes(tipo)) {
      evento.valor = -Math.abs(valor); // Sempre negativo para despesas
    } else {
      evento.valor = Math.abs(valor); // Sempre positivo para receitas
    }

    // Para vendas iFood, manter status se existir
    if (tipo === "VENDAS-IFOOD" && !evento.status) {
      evento.status = "pendente";
    }

    // Salvar dados
    this.calculateEstoqueAtual();
    this.saveData();
    this.updateEventosTable();
    this.updateEstoqueTotalChart();
    this.updateEstoqueVisualizacao();
    this.updateDashboard();

    // Fechar modal
    document.getElementById("edit-evento-modal").classList.remove("active");
    this.currentEditingEventoId = null;

    alert("Evento atualizado com sucesso!");
  }

  deleteEvento(eventoId) {
    this.showConfirmModal(
      "Excluir Evento",
      "Tem certeza que deseja excluir este evento?",
      () => {
        this.data.eventos = this.data.eventos.filter((e) => e.id !== eventoId);
        this.calculateEstoqueAtual();
        this.saveData();
        this.updateEventosTable();
        this.updateEstoqueTotalChart();
        this.updateEstoqueVisualizacao();
        this.updateDashboard();
      }
    );
  }

  // Relatórios
  setupRelatorioFilters() {
    const periodoSelect = document.getElementById("relatorio-periodo");
    const dataInicio = document.getElementById("relatorio-data-inicio");
    const dataFim = document.getElementById("relatorio-data-fim");

    if (periodoSelect) {
      periodoSelect.addEventListener("change", () => {
        const periodo = periodoSelect.value;
        const hoje = new Date();

        switch (periodo) {
          case "hoje":
            dataInicio.value = hoje.toISOString().split("T")[0];
            dataFim.value = hoje.toISOString().split("T")[0];
            break;
          case "semana-atual":
            const inicioSemana = new Date(hoje);
            inicioSemana.setDate(hoje.getDate() - hoje.getDay());
            const fimSemana = new Date(inicioSemana);
            fimSemana.setDate(inicioSemana.getDate() + 6);
            dataInicio.value = inicioSemana.toISOString().split("T")[0];
            dataFim.value = fimSemana.toISOString().split("T")[0];
            break;
          case "mes-atual":
            dataInicio.value = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
              .toISOString()
              .split("T")[0];
            dataFim.value = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
              .toISOString()
              .split("T")[0];
            break;
          case "mes-passado":
            dataInicio.value = new Date(
              hoje.getFullYear(),
              hoje.getMonth() - 1,
              1
            )
              .toISOString()
              .split("T")[0];
            dataFim.value = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
              .toISOString()
              .split("T")[0];
            break;
          case "ultimo-trimestre":
            dataInicio.value = new Date(
              hoje.getFullYear(),
              hoje.getMonth() - 3,
              1
            )
              .toISOString()
              .split("T")[0];
            dataFim.value = hoje.toISOString().split("T")[0];
            break;
        }
      });

      // Definir período padrão
      periodoSelect.value = "mes-atual";
      periodoSelect.dispatchEvent(new Event("change"));
    }

    // Inicializar filtro de categorias
    this.updateRelatorioCategorias();
  }

  updateRelatorioCategorias() {
    const tipoEvento = document.getElementById("relatorio-tipo-evento").value;
    const categoriaSelect = document.getElementById("relatorio-categoria");

    if (!categoriaSelect) return;

    // Limpar opções atuais
    categoriaSelect.innerHTML = '<option value="">Todas as Categorias</option>';

    if (!tipoEvento) {
      categoriaSelect.disabled = true;
      return;
    }

    categoriaSelect.disabled = false;

    // Adicionar categorias baseadas no tipo de evento
    let categorias = [];

    switch (tipoEvento) {
      case "ENTRADAS":
        categorias = this.categorias.receitas;
        break;
      case "DESPESAS":
      case "IMPOSTOS":
      case "OUTROS":
        categorias = this.categorias.despesas;
        break;
      default:
        categoriaSelect.disabled = true;
        return;
    }

    // Ordenar categorias alfabeticamente
    categorias.sort().forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria;
      categoriaSelect.appendChild(option);
    });
  }

  gerarRelatorio() {
    const dataInicio = document.getElementById("relatorio-data-inicio").value;
    const dataFim = document.getElementById("relatorio-data-fim").value;
    const tipoEventoFiltro = document.getElementById(
      "relatorio-tipo-evento"
    ).value;
    const categoriaFiltro = document.getElementById(
      "relatorio-categoria"
    ).value;

    if (!dataInicio || !dataFim) {
      alert("Selecione um período para o relatório.");
      return;
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    // Filtrar eventos por período
    let eventosPeriodo = this.data.eventos.filter((evento) => {
      const dataEvento = new Date(evento.data);
      return dataEvento >= inicio && dataEvento <= fim;
    });

    // Aplicar filtro de tipo de evento se selecionado
    if (tipoEventoFiltro) {
      eventosPeriodo = eventosPeriodo.filter(
        (evento) => evento.tipo === tipoEventoFiltro
      );
    }

    // Aplicar filtro de categoria se selecionado
    if (categoriaFiltro) {
      eventosPeriodo = eventosPeriodo.filter(
        (evento) => evento.categoria === categoriaFiltro
      );
    }

    // Armazenar dados para exportação
    this.dadosRelatorioAtual = {
      periodo: { inicio: dataInicio, fim: dataFim },
      tipoEventoFiltro,
      categoriaFiltro,
      eventos: eventosPeriodo,
    };

    // Calcular métricas financeiras
    const totalReceitas = eventosPeriodo
      .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    const totalDespesas = eventosPeriodo
      .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
      .reduce((total, e) => total + (e.valor || 0), 0);

    const lucroLiquido = totalReceitas - totalDespesas;

    // Atualizar resumo financeiro
    document.getElementById("relatorio-receitas").textContent =
      this.formatCurrency(totalReceitas);
    document.getElementById("relatorio-despesas").textContent =
      this.formatCurrency(totalDespesas);
    document.getElementById("relatorio-lucro").textContent =
      this.formatCurrency(lucroLiquido);

    // Gerar detalhamento por categoria
    this.gerarDetalhamentoCategorias(eventosPeriodo);

    // Produtos vendidos (todos os dados)
    const produtosVendidos = {};
    eventosPeriodo
      .filter(
        (e) =>
          ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(e.tipo) && e.produtos
      )
      .forEach((evento) => {
        evento.produtos.forEach((produto) => {
          if (!produtosVendidos[produto.nome]) {
            produtosVendidos[produto.nome] = {
              quantidade: 0,
              valorTotal: 0,
            };
          }
          produtosVendidos[produto.nome].quantidade += produto.quantidade;
          produtosVendidos[produto.nome].valorTotal +=
            produto.quantidade * produto.valorUnitario;
        });
      });

    // Top 10 produtos mais vendidos
    const produtosOrdenados = Object.entries(produtosVendidos)
      .sort((a, b) => b[1].quantidade - a[1].quantidade)
      .slice(0, 10);

    const containerTop10 = document.getElementById("produtos-mais-vendidos");
    if (produtosOrdenados.length === 0) {
      containerTop10.innerHTML =
        '<p class="empty-state">Nenhuma venda no período selecionado</p>';
    } else {
      containerTop10.innerHTML = produtosOrdenados
        .map(
          ([nome, dados]) => `
                <div class="summary-item">
                    <span>${nome}</span>
                    <span class="status-positive">${
                      dados.quantidade
                    } vendidos - ${this.formatCurrency(dados.valorTotal)}</span>
                </div>
            `
        )
        .join("");
    }

    // Detalhamento completo de todos os produtos (ordenado por quantidade - maior para menor)
    const todosProtudosOrdenados = Object.entries(produtosVendidos).sort(
      (a, b) => b[1].quantidade - a[1].quantidade
    ); // Ordenação por quantidade (maior para menor)

    const containerTodos = document.getElementById("todos-produtos-vendidos");
    if (todosProtudosOrdenados.length === 0) {
      containerTodos.innerHTML =
        '<p class="empty-state">Nenhuma venda no período selecionado</p>';
    } else {
      containerTodos.innerHTML = `
        <div class="produtos-detalhados">
          ${todosProtudosOrdenados
            .map(
              ([nome, dados]) => `
                <div class="summary-item">
                  <span>${nome}</span>
                  <span class="status-positive">${
                    dados.quantidade
                  } unidades - ${this.formatCurrency(dados.valorTotal)}</span>
                </div>
              `
            )
            .join("")}
          <div class="summary-item total">
            <span><strong>TOTAL GERAL:</strong></span>
            <span class="status-positive"><strong>${Object.values(
              produtosVendidos
            ).reduce(
              (total, dados) => total + dados.quantidade,
              0
            )} unidades - ${this.formatCurrency(
        Object.values(produtosVendidos).reduce(
          (total, dados) => total + dados.valorTotal,
          0
        )
      )}</strong></span>
          </div>
        </div>
      `;
    }

    // Habilitar botão de exportação
    document.getElementById("exportar-relatorio-xls").disabled = false;
  }

  gerarDetalhamentoCategorias(eventosPeriodo) {
    const container = document.getElementById("detalhamento-categorias");

    if (eventosPeriodo.length === 0) {
      container.innerHTML =
        '<p class="empty-state">Nenhum evento no período selecionado</p>';
      return;
    }

    // Agrupar por tipo e categoria
    const agrupamento = {};

    eventosPeriodo.forEach((evento) => {
      const tipo = evento.tipo;
      const categoria = evento.categoria || "Sem categoria";

      if (!agrupamento[tipo]) {
        agrupamento[tipo] = {};
      }

      if (!agrupamento[tipo][categoria]) {
        agrupamento[tipo][categoria] = {
          quantidade: 0,
          valorTotal: 0,
          eventos: [],
        };
      }

      agrupamento[tipo][categoria].quantidade += 1;
      agrupamento[tipo][categoria].valorTotal += evento.valor || 0;
      agrupamento[tipo][categoria].eventos.push(evento);
    });

    // Gerar HTML do detalhamento
    let html = '<div class="detalhamento-categorias">';

    // Ordenar tipos por valor total (maior para menor)
    const tiposOrdenados = Object.keys(agrupamento)
      .map((tipo) => {
        const totalTipo = Object.values(agrupamento[tipo]).reduce(
          (total, dados) => total + dados.valorTotal,
          0
        );
        return { tipo, totalTipo };
      })
      .sort((a, b) => b.totalTipo - a.totalTipo);

    tiposOrdenados.forEach(({ tipo }) => {
      const isReceita = ["VENDAS", "ENTRADAS"].includes(tipo);
      const classeStatus = isReceita ? "status-positive" : "status-negative";

      html += `
        <div class="categoria-grupo">
          <h4 class="${classeStatus}">${tipo}</h4>
          <div class="categoria-items">
      `;

      // Ordenar categorias por valor total (maior para menor)
      const categoriasOrdenadas = Object.keys(agrupamento[tipo])
        .map((categoria) => ({
          categoria,
          dados: agrupamento[tipo][categoria],
        }))
        .sort((a, b) => b.dados.valorTotal - a.dados.valorTotal);

      categoriasOrdenadas.forEach(({ categoria, dados }) => {
        html += `
          <div class="summary-item">
            <span>${categoria}</span>
            <span class="${classeStatus}">
              ${dados.quantidade} evento(s) - ${this.formatCurrency(
          dados.valorTotal
        )}
            </span>
          </div>
        `;
      });

      // Total do tipo
      const totalTipo = Object.values(agrupamento[tipo]).reduce(
        (total, dados) => total + dados.valorTotal,
        0
      );
      const quantidadeTipo = Object.values(agrupamento[tipo]).reduce(
        (total, dados) => total + dados.quantidade,
        0
      );

      html += `
          <div class="summary-item total">
            <span><strong>Total ${tipo}:</strong></span>
            <span class="${classeStatus}"><strong>${quantidadeTipo} evento(s) - ${this.formatCurrency(
        totalTipo
      )}</strong></span>
          </div>
        </div>
      </div>
      `;
    });

    html += "</div>";
    container.innerHTML = html;
  }

  exportarRelatorioXLS() {
    if (!this.dadosRelatorioAtual) {
      alert("Gere um relatório primeiro antes de exportar.");
      return;
    }

    try {
      // Verificar se a biblioteca XLSX está disponível
      if (typeof XLSX === "undefined") {
        // Fallback para CSV se XLSX não estiver disponível
        this.exportarRelatorioCSV();
        return;
      }

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // ========================
      // PLANILHA 1: RESUMO GERAL
      // ========================
      const resumoData = [];

      // Cabeçalho
      resumoData.push(["CRM GELADINHOS GOURMET - RELATÓRIO RESUMO"]);
      resumoData.push([]);
      resumoData.push(["INFORMAÇÕES DO RELATÓRIO"]);
      resumoData.push([
        "Período de Análise:",
        `${this.dadosRelatorioAtual.periodo.inicio} até ${this.dadosRelatorioAtual.periodo.fim}`,
      ]);

      if (this.dadosRelatorioAtual.tipoEventoFiltro) {
        resumoData.push([
          "Tipo de Evento Filtrado:",
          this.dadosRelatorioAtual.tipoEventoFiltro,
        ]);
      }

      if (this.dadosRelatorioAtual.categoriaFiltro) {
        resumoData.push([
          "Categoria Filtrada:",
          this.dadosRelatorioAtual.categoriaFiltro,
        ]);
      }

      resumoData.push(["Data de Geração:", new Date().toLocaleString("pt-BR")]);
      resumoData.push([]);

      // Resumo Financeiro
      const totalReceitas = this.dadosRelatorioAtual.eventos
        .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
        .reduce((total, e) => total + (e.valor || 0), 0);

      const totalDespesas = this.dadosRelatorioAtual.eventos
        .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
        .reduce((total, e) => total + (e.valor || 0), 0);

      resumoData.push(["RESUMO FINANCEIRO"]);
      resumoData.push(["Descrição", "Valor (R$)"]);
      resumoData.push(["Total de Receitas", totalReceitas]);
      resumoData.push(["Total de Despesas", totalDespesas]);
      resumoData.push(["Lucro Líquido", totalReceitas - totalDespesas]);
      resumoData.push([]);

      // Estatísticas Gerais
      resumoData.push(["ESTATÍSTICAS GERAIS"]);
      resumoData.push([
        "Total de Eventos:",
        this.dadosRelatorioAtual.eventos.length,
      ]);
      resumoData.push([
        "Período de Análise (dias):",
        Math.ceil(
          (new Date(this.dadosRelatorioAtual.periodo.fim) -
            new Date(this.dadosRelatorioAtual.periodo.inicio)) /
            (1000 * 60 * 60 * 24)
        ) + 1,
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, ws1, "Resumo Geral");

      // ========================
      // PLANILHA 2: EVENTOS DETALHADOS
      // ========================
      const eventosData = [];

      // Cabeçalho
      eventosData.push(["EVENTOS FINANCEIROS DETALHADOS"]);
      eventosData.push([]);
      eventosData.push([
        "Data",
        "Tipo de Evento",
        "Categoria",
        "Descrição",
        "Cliente",
        "Valor (R$)",
        "Status",
      ]);

      // Eventos ordenados por data
      this.dadosRelatorioAtual.eventos
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .forEach((evento) => {
          let cliente = "";
          if (evento.cliente) {
            const clienteData = this.data.clientes.find(
              (c) => c.id === evento.cliente
            );
            cliente = clienteData ? clienteData.nome : "Cliente não encontrado";
          }

          let status = "Concluído";
          if (evento.tipo === "VENDAS-IFOOD") {
            status = evento.status === "pendente" ? "Pendente 30d" : "Recebido";
          }

          eventosData.push([
            this.formatDate(evento.data),
            evento.tipo || "",
            evento.categoria || "",
            evento.descricao || "",
            cliente,
            evento.valor || 0,
            status,
          ]);
        });

      const ws2 = XLSX.utils.aoa_to_sheet(eventosData);
      XLSX.utils.book_append_sheet(wb, ws2, "Eventos Detalhados");

      // ========================
      // PLANILHA 3: DETALHAMENTO POR CATEGORIA
      // ========================
      const categoriasData = [];

      // Cabeçalho
      categoriasData.push(["DETALHAMENTO POR CATEGORIA"]);
      categoriasData.push([]);
      categoriasData.push([
        "Tipo de Evento",
        "Categoria",
        "Quantidade de Eventos",
        "Valor Total (R$)",
      ]);

      // Agrupar por tipo e categoria
      const agrupamento = {};
      this.dadosRelatorioAtual.eventos.forEach((evento) => {
        const tipo = evento.tipo;
        const categoria = evento.categoria || "Sem categoria";

        if (!agrupamento[tipo]) {
          agrupamento[tipo] = {};
        }

        if (!agrupamento[tipo][categoria]) {
          agrupamento[tipo][categoria] = {
            quantidade: 0,
            valorTotal: 0,
          };
        }

        agrupamento[tipo][categoria].quantidade += 1;
        agrupamento[tipo][categoria].valorTotal += evento.valor || 0;
      });

      // Adicionar dados agrupados
      Object.keys(agrupamento)
        .sort()
        .forEach((tipo) => {
          Object.keys(agrupamento[tipo])
            .sort()
            .forEach((categoria) => {
              const dados = agrupamento[tipo][categoria];
              categoriasData.push([
                tipo,
                categoria,
                dados.quantidade,
                dados.valorTotal,
              ]);
            });

          // Subtotal por tipo
          const totalTipo = Object.values(agrupamento[tipo]).reduce(
            (total, dados) => total + dados.valorTotal,
            0
          );
          const quantidadeTipo = Object.values(agrupamento[tipo]).reduce(
            (total, dados) => total + dados.quantidade,
            0
          );

          categoriasData.push([`TOTAL ${tipo}`, "", quantidadeTipo, totalTipo]);
          categoriasData.push([]); // Linha em branco
        });

      const ws3 = XLSX.utils.aoa_to_sheet(categoriasData);
      XLSX.utils.book_append_sheet(wb, ws3, "Por Categoria");

      // ========================
      // PLANILHA 4: PRODUTOS VENDIDOS
      // ========================
      const produtosData = [];

      // Cabeçalho
      produtosData.push(["PRODUTOS VENDIDOS - DETALHAMENTO COMPLETO"]);
      produtosData.push([]);
      produtosData.push([
        "Produto",
        "Quantidade Vendida",
        "Valor Unitário (R$)",
        "Valor Total (R$)",
      ]);

      // Calcular produtos vendidos
      const produtosVendidos = {};
      this.dadosRelatorioAtual.eventos
        .filter(
          (e) =>
            ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(e.tipo) && e.produtos
        )
        .forEach((evento) => {
          evento.produtos.forEach((produto) => {
            if (!produtosVendidos[produto.nome]) {
              produtosVendidos[produto.nome] = {
                quantidade: 0,
                valorTotal: 0,
                valorUnitario: produto.valorUnitario,
              };
            }
            produtosVendidos[produto.nome].quantidade += produto.quantidade;
            produtosVendidos[produto.nome].valorTotal +=
              produto.quantidade * produto.valorUnitario;
          });
        });

      if (Object.keys(produtosVendidos).length > 0) {
        // Adicionar produtos ordenados alfabeticamente
        Object.entries(produtosVendidos)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([nome, dados]) => {
            produtosData.push([
              nome,
              dados.quantidade,
              dados.valorUnitario,
              dados.valorTotal,
            ]);
          });

        // Total geral
        const totalQuantidade = Object.values(produtosVendidos).reduce(
          (total, dados) => total + dados.quantidade,
          0
        );
        const totalValor = Object.values(produtosVendidos).reduce(
          (total, dados) => total + dados.valorTotal,
          0
        );

        produtosData.push([]);
        produtosData.push(["TOTAL GERAL", totalQuantidade, "", totalValor]);
      } else {
        produtosData.push(["Nenhum produto vendido no período selecionado"]);
      }

      const ws4 = XLSX.utils.aoa_to_sheet(produtosData);
      XLSX.utils.book_append_sheet(wb, ws4, "Produtos Vendidos");

      // ========================
      // PLANILHA 5: ANÁLISE DE PERFORMANCE
      // ========================
      const performanceData = [];

      performanceData.push(["ANÁLISE DE PERFORMANCE"]);
      performanceData.push([]);

      // Top 10 produtos mais vendidos
      performanceData.push(["TOP 10 PRODUTOS MAIS VENDIDOS"]);
      performanceData.push([
        "Posição",
        "Produto",
        "Quantidade",
        "Valor Total (R$)",
        "% do Total",
      ]);

      const produtosOrdenados = Object.entries(produtosVendidos)
        .sort((a, b) => b[1].quantidade - a[1].quantidade)
        .slice(0, 10);

      const totalGeralProdutos = Object.values(produtosVendidos).reduce(
        (total, dados) => total + dados.quantidade,
        0
      );

      produtosOrdenados.forEach(([nome, dados], index) => {
        const percentual =
          totalGeralProdutos > 0
            ? ((dados.quantidade / totalGeralProdutos) * 100).toFixed(1)
            : 0;
        performanceData.push([
          index + 1,
          nome,
          dados.quantidade,
          dados.valorTotal,
          `${percentual}%`,
        ]);
      });

      performanceData.push([]);

      // Análise por tipo de evento
      performanceData.push(["ANÁLISE POR TIPO DE EVENTO"]);
      performanceData.push([
        "Tipo",
        "Quantidade de Eventos",
        "Valor Total (R$)",
        "Valor Médio (R$)",
      ]);

      const analiseEventos = {};
      this.dadosRelatorioAtual.eventos.forEach((evento) => {
        if (!analiseEventos[evento.tipo]) {
          analiseEventos[evento.tipo] = {
            quantidade: 0,
            valorTotal: 0,
          };
        }
        analiseEventos[evento.tipo].quantidade += 1;
        analiseEventos[evento.tipo].valorTotal += evento.valor || 0;
      });

      Object.keys(analiseEventos)
        .sort()
        .forEach((tipo) => {
          const dados = analiseEventos[tipo];
          const valorMedio =
            dados.quantidade > 0 ? dados.valorTotal / dados.quantidade : 0;

          performanceData.push([
            tipo,
            dados.quantidade,
            dados.valorTotal,
            valorMedio,
          ]);
        });

      const ws5 = XLSX.utils.aoa_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, ws5, "Análise Performance");

      // Gerar arquivo e download
      const nomeArquivo = `relatorio-crm-${this.dadosRelatorioAtual.periodo.inicio}-${this.dadosRelatorioAtual.periodo.fim}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);

      alert(
        "Relatório Excel exportado com sucesso!\n\nO arquivo contém 5 planilhas:\n• Resumo Geral\n• Eventos Detalhados\n• Por Categoria\n• Produtos Vendidos\n• Análise Performance"
      );
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      // Fallback para CSV
      this.exportarRelatorioCSV();
    }
  }

  // Função de fallback para CSV caso XLSX não esteja disponível
  exportarRelatorioCSV() {
    try {
      // Criar dados do cabeçalho do relatório
      const dadosExportacao = [];

      // Cabeçalho do relatório
      dadosExportacao.push(["RELATÓRIO CRM GELADINHOS GOURMET"]);
      dadosExportacao.push([""]);
      dadosExportacao.push([
        "Período:",
        `${this.dadosRelatorioAtual.periodo.inicio} até ${this.dadosRelatorioAtual.periodo.fim}`,
      ]);

      if (this.dadosRelatorioAtual.tipoEventoFiltro) {
        dadosExportacao.push([
          "Tipo de Evento:",
          this.dadosRelatorioAtual.tipoEventoFiltro,
        ]);
      }

      if (this.dadosRelatorioAtual.categoriaFiltro) {
        dadosExportacao.push([
          "Categoria:",
          this.dadosRelatorioAtual.categoriaFiltro,
        ]);
      }

      dadosExportacao.push([
        "Data de Geração:",
        new Date().toLocaleString("pt-BR"),
      ]);
      dadosExportacao.push([""]);

      // Resumo Financeiro
      const totalReceitas = this.dadosRelatorioAtual.eventos
        .filter((e) => ["VENDAS", "ENTRADAS"].includes(e.tipo))
        .reduce((total, e) => total + (e.valor || 0), 0);

      const totalDespesas = this.dadosRelatorioAtual.eventos
        .filter((e) => ["DESPESAS", "IMPOSTOS", "OUTROS"].includes(e.tipo))
        .reduce((total, e) => total + (e.valor || 0), 0);

      dadosExportacao.push(["RESUMO FINANCEIRO"]);
      dadosExportacao.push(["Total Receitas:", totalReceitas]);
      dadosExportacao.push(["Total Despesas:", totalDespesas]);
      dadosExportacao.push(["Lucro Líquido:", totalReceitas - totalDespesas]);
      dadosExportacao.push([""]);

      // Eventos detalhados
      dadosExportacao.push(["EVENTOS DETALHADOS"]);
      dadosExportacao.push([
        "Data",
        "Tipo",
        "Categoria",
        "Descrição",
        "Cliente",
        "Valor",
      ]);

      this.dadosRelatorioAtual.eventos
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .forEach((evento) => {
          let cliente = "";
          if (evento.cliente) {
            const clienteData = this.data.clientes.find(
              (c) => c.id === evento.cliente
            );
            cliente = clienteData ? clienteData.nome : "Cliente não encontrado";
          }

          dadosExportacao.push([
            this.formatDate(evento.data),
            evento.tipo || "",
            evento.categoria || "",
            evento.descricao || "",
            cliente,
            evento.valor || 0,
          ]);
        });

      dadosExportacao.push([""]);

      // Produtos vendidos (se houver)
      const produtosVendidos = {};
      this.dadosRelatorioAtual.eventos
        .filter(
          (e) =>
            ["VENDAS", "BRINDES", "VENDAS-IFOOD"].includes(e.tipo) && e.produtos
        )
        .forEach((evento) => {
          evento.produtos.forEach((produto) => {
            if (!produtosVendidos[produto.nome]) {
              produtosVendidos[produto.nome] = {
                quantidade: 0,
                valorTotal: 0,
              };
            }
            produtosVendidos[produto.nome].quantidade += produto.quantidade;
            produtosVendidos[produto.nome].valorTotal +=
              produto.quantidade * produto.valorUnitario;
          });
        });

      if (Object.keys(produtosVendidos).length > 0) {
        dadosExportacao.push(["PRODUTOS VENDIDOS"]);
        dadosExportacao.push(["Produto", "Quantidade", "Valor Total"]);

        Object.entries(produtosVendidos)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([nome, dados]) => {
            dadosExportacao.push([nome, dados.quantidade, dados.valorTotal]);
          });

        // Total geral de produtos
        const totalQuantidade = Object.values(produtosVendidos).reduce(
          (total, dados) => total + dados.quantidade,
          0
        );
        const totalValor = Object.values(produtosVendidos).reduce(
          (total, dados) => total + dados.valorTotal,
          0
        );
        dadosExportacao.push(["TOTAL GERAL", totalQuantidade, totalValor]);
      }

      // Converter para CSV (compatível com Excel)
      const csvContent = dadosExportacao
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      // Criar e baixar arquivo
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio-crm-${this.dadosRelatorioAtual.periodo.inicio}-${this.dadosRelatorioAtual.periodo.fim}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(
        "Relatório CSV exportado com sucesso! (Fallback - biblioteca Excel não disponível)"
      );
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório. Tente novamente.");
    }
  }

  // Configurações
  updateConfiguracoes() {
    // Atualizar estatísticas gerais
    this.updateEstatisticasGerais();

    // Atualizar configurações avançadas
    const nomeEmpresa = document.getElementById("nome-empresa");
    const formatoMoeda = document.getElementById("formato-moeda");

    if (nomeEmpresa)
      nomeEmpresa.value =
        this.data.configuracoes.nomeEmpresa || "Geladinhos Gourmet";
    if (formatoMoeda)
      formatoMoeda.value = this.data.configuracoes.formatoMoeda || "BRL";
  }

  updateEstatisticasGerais() {
    const totalClientesConfig = document.getElementById(
      "total-clientes-config"
    );
    const totalProdutosConfig = document.getElementById(
      "total-produtos-config"
    );
    const totalEventosConfig = document.getElementById("total-eventos-config");
    const ultimaAtualizacao = document.getElementById("ultima-atualizacao");

    if (totalClientesConfig)
      totalClientesConfig.textContent = this.data.clientes.length;
    if (totalProdutosConfig)
      totalProdutosConfig.textContent = this.data.produtos.length;
    if (totalEventosConfig)
      totalEventosConfig.textContent = this.data.eventos.length;
    if (ultimaAtualizacao)
      ultimaAtualizacao.textContent = new Date().toLocaleString("pt-BR");
  }

  fazerBackup() {
    try {
      const dataBackup = {
        ...this.data,
        versao: "3.0",
        dataBackup: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(dataBackup, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `crm-geladinhos-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      alert("Backup criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      alert("Erro ao criar backup. Tente novamente.");
    }
  }

  importarBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);

        // Validar estrutura do backup
        if (
          !backupData.clientes ||
          !backupData.produtos ||
          !backupData.eventos
        ) {
          throw new Error("Arquivo de backup inválido.");
        }

        this.showConfirmModal(
          "Importar Backup",
          "Tem certeza que deseja importar este backup? Todos os dados atuais serão substituídos.",
          () => {
            this.data = {
              clientes: backupData.clientes || [],
              produtos: backupData.produtos || [],
              bairros: backupData.bairros || [],
              estoque: backupData.estoque || [],
              estoqueAtual: backupData.estoqueAtual || {},
              eventos: backupData.eventos || [],
              metas: backupData.metas || {
                receitaMensal: 0,
                despesasMensais: 0,
                categoria: "",
                vendas: { diaria: 0, semanal: 0, mensal: 0 },
              },
              configuracoes: backupData.configuracoes || {
                nomeEmpresa: "Geladinhos Gourmet",
                formatoMoeda: "BRL",
                categoriasPersonalizadas: [],
                salarioBrenda: { porcentagem: 15, ativo: true },
              },
            };

            this.calculateEstoqueAtual();
            this.saveData();
            this.updateAllSections();
            this.updateDashboard();

            alert("Backup importado com sucesso!");

            // Recarregar a página para garantir que tudo está atualizado
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        );
      } catch (error) {
        console.error("Erro ao importar backup:", error);
        alert("Erro ao importar backup. Verifique se o arquivo é válido.");
      }
    };

    reader.readAsText(file);

    // Limpar o input
    document.getElementById("importar-backup").value = "";
  }

  resetarSistema() {
    this.data = {
      clientes: [],
      produtos: [],
      bairros: [],
      estoque: [],
      estoqueAtual: {},
      eventos: [],
      metas: {
        receitaMensal: 0,
        despesasMensais: 0,
        categoria: "",
        vendas: { diaria: 0, semanal: 0, mensal: 0 },
      },
      configuracoes: {
        nomeEmpresa: "Geladinhos Gourmet",
        formatoMoeda: "BRL",
        categoriasPersonalizadas: [],
        salarioBrenda: { porcentagem: 15, ativo: true },
      },
    };

    localStorage.removeItem("crm-geladinhos-data");

    alert("Sistema resetado com sucesso!");

    // Recarregar a página
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  saveConfiguracoes() {
    const nomeEmpresa = document.getElementById("nome-empresa").value.trim();
    const formatoMoeda = document.getElementById("formato-moeda").value;
    const categoriaPersonalizada = document
      .getElementById("categoria-personalizada")
      .value.trim();

    this.data.configuracoes.nomeEmpresa = nomeEmpresa || "Geladinhos Gourmet";
    this.data.configuracoes.formatoMoeda = formatoMoeda || "BRL";

    if (
      categoriaPersonalizada &&
      !this.data.configuracoes.categoriasPersonalizadas.includes(
        categoriaPersonalizada
      )
    ) {
      this.data.configuracoes.categoriasPersonalizadas.push(
        categoriaPersonalizada
      );
      document.getElementById("categoria-personalizada").value = "";
    }

    this.saveData();
    alert("Configurações salvas com sucesso!");
  }

  // Modais
  showConfirmModal(title, message, callback) {
    const modal = document.getElementById("confirm-modal");
    const modalTitle = document.getElementById("modal-title");
    const confirmMessage = document.getElementById("confirm-message");

    if (modalTitle) modalTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    if (modal) modal.classList.add("active");
    this.confirmCallback = callback;
  }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing CRM...");
  const crm = new CRMGeladinhos();

  // Expor globalmente para uso nos event handlers inline
  window.crm = crm;

  console.log("CRM initialized successfully");
});
