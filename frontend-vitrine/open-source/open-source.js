/**
 * DEUS VULT · Open Source landing — gaveteiro + triade homeostase
 */
(function () {
  "use strict";

  var GAVETAS = {
    identidade: {
      titulo: "identidade",
      funcao: "Nomear o sistema, autor, versão e finalidade.",
      campos: ["nome", "versão", "controlador", "status"],
    },
    tese: {
      titulo: "tese",
      funcao: "Declarar a proposição central — curta, com limite explícito.",
      campos: ["frase_curta", "descrição", "limite"],
    },
    estrutura: {
      titulo: "estrutura",
      funcao: "Mapear partes, dependências e fluxo entre componentes.",
      campos: ["componentes", "dependências", "fluxo"],
    },
    evidencia: {
      titulo: "evidência",
      funcao: "Separar prova de inferência — rastreabilidade verificável.",
      campos: ["arquivo", "hash", "fonte", "grau_de_confianca"],
    },
    risco: {
      titulo: "risco",
      funcao: "Identificar falhas, excessos e conflitos antes de agir.",
      campos: ["risco", "impacto", "mitigação"],
    },
    operacao: {
      titulo: "operação",
      funcao: "Converter tese em ação concreta com responsável e prazo.",
      campos: ["próxima_acao", "responsável", "prazo", "saída_esperada"],
    },
    auditoria: {
      titulo: "auditoria",
      funcao: "Registrar validação, método e resultado com hash.",
      campos: ["status", "método", "resultado", "hash"],
    },
    traducao: {
      titulo: "tradução pública",
      funcao: "Tornar a estrutura compreensível para quem não conhece todo o histórico.",
      campos: [
        "resumo_em_uma_frase",
        "para_que_serve",
        "o_que_nao_e",
        "risco_principal",
        "próxima_acao",
        "passo_pratico",
        "critério_de_pronto",
      ],
    },
  };

  function renderGaveta(id) {
    var g = GAVETAS[id];
    if (!g) return;
    var panel = document.getElementById("gavetaPanel");
    if (!panel) return;

    var html =
      "<h3>" +
      g.titulo +
      "</h3>" +
      '<p class="funcao">' +
      g.funcao +
      "</p>" +
      "<p><strong>Campos:</strong></p><ul>";

    for (var i = 0; i < g.campos.length; i++) {
      html += "<li>" + g.campos[i] + "</li>";
    }
    html += "</ul>";
    panel.innerHTML = html;
  }

  function initGavetas() {
    var tabs = document.querySelectorAll("#gavetaTabs button");
    if (!tabs.length) return;

    renderGaveta("identidade");

    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () {
        var id = this.getAttribute("data-gaveta");
        for (var j = 0; j < tabs.length; j++) {
          tabs[j].setAttribute("aria-selected", tabs[j] === this ? "true" : "false");
        }
        renderGaveta(id);
      });
    }
  }

  function showTriadeFace(face) {
    var cards = document.querySelectorAll(".os-triade-card");
    var nodes = document.querySelectorAll(".triade-node");

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var isActive = card.getAttribute("data-face") === face;
      card.hidden = !isActive;
      card.classList.toggle("is-active", isActive);
    }

    for (var n = 0; n < nodes.length; n++) {
      nodes[n].classList.toggle("is-active", nodes[n].getAttribute("data-node") === face);
    }
  }

  function initTriade() {
    var nodes = document.querySelectorAll(".triade-node");
    var faces = ["entendimento", "teoria", "pratica"];
    var idx = 0;
    var timer = null;

    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        node.addEventListener("click", function () {
          showTriadeFace(node.getAttribute("data-node"));
          resetCycle();
        });
        node.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showTriadeFace(node.getAttribute("data-node"));
            resetCycle();
          }
        });
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "button");
      })(nodes[i]);
    }

    function cycle() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      idx = (idx + 1) % faces.length;
      showTriadeFace(faces[idx]);
    }

    function resetCycle() {
      if (timer) clearInterval(timer);
      var active = document.querySelector(".os-triade-card.is-active");
      var activeFace = active ? active.getAttribute("data-face") : "entendimento";
      idx = faces.indexOf(activeFace);
      if (idx < 0) idx = 0;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = setInterval(cycle, 8000);
      }
    }

    resetCycle();
  }

  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var blocks = document.querySelectorAll(".os-block, .os-hero");
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].style.opacity = "0";
      blocks[i].style.transform = "translateY(18px)";
      blocks[i].style.transition = "opacity 0.6s ease, transform 0.6s ease";
    }

    var obs = new IntersectionObserver(
      function (entries) {
        for (var j = 0; j < entries.length; j++) {
          if (entries[j].isIntersecting) {
            entries[j].target.style.opacity = "1";
            entries[j].target.style.transform = "translateY(0)";
            obs.unobserve(entries[j].target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    for (var k = 0; k < blocks.length; k++) {
      obs.observe(blocks[k]);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGavetas();
    initTriade();
    initReveal();
  });
})();
