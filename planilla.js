/*
 * ===========================================================
 *  CONTENIDO DESDE LA PLANILLA DE GOOGLE
 * ===========================================================
 *
 *  Lee la planilla que maneja Lucia y actualiza con ella las promos, los
 *  tratamientos, los productos, las preguntas frecuentes y algunas frases
 *  sueltas de la pagina.
 *
 *  Cada pestania de la planilla es una seccion y cada fila es una tarjeta.
 *
 *  IMPORTANTE: si la planilla no contesta (sin internet, sin permiso, mal
 *  escrita, etc.) la pagina se queda con lo que ya esta escrito en
 *  index.html. Nunca se rompe ni se queda vacia.
 *
 *  Para que esto funcione, la planilla tiene que estar compartida como
 *  "Cualquier persona con el enlace" con permiso de Lector.
 */
(function () {
  // El id de la planilla es lo que va entre /d/ y /edit en su direccion:
  // https://docs.google.com/spreadsheets/d/ESTO_DE_ACA/edit
  const PLANILLA_ID = "1_m8bTsnsiHyhxOwDFGXqBp5SbpMGenbGagQJTCYAd-U";

  if (!PLANILLA_ID) return;

  const WHATSAPP = "542615860906";
  const GUIA =
    "https://www.canva.com/design/DAGs4awJCug/ETMjLIBrblY1ajZrfKWo2g/view?utm_content=DAGs4awJCug&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h74d9dac61c#5";

  // ---------- Utilidades ----------

  // Evita que un texto de la planilla se interprete como HTML.
  const esc = (t) =>
    String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // "Precio anterior" -> "precio anterior" (sin acentos ni mayusculas),
  // asi no importa como este escrito el titulo de la columna.
  const normalizar = (t) =>
    String(t || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // Convierte un texto CSV en filas (respeta comillas y saltos de linea).
  function leerCsv(texto) {
    const filas = [];
    let fila = [];
    let campo = "";
    let entreComillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (entreComillas) {
        if (c === '"' && texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else if (c === '"') entreComillas = false;
        else campo += c;
      } else if (c === '"') entreComillas = true;
      else if (c === ",") {
        fila.push(campo);
        campo = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = "";
      } else campo += c;
    }
    if (campo || fila.length) {
      fila.push(campo);
      filas.push(fila);
    }
    return filas;
  }

  // Busca el valor de una columna por su titulo. Primero intenta una
  // coincidencia exacta y recien despues una que empiece igual, asi
  // "Descripcion corta" sirve como "Descripcion", pero pedir "precio" no
  // devuelve por error lo que hay en "precio anterior".
  function valor(fila, ...nombres) {
    const claves = Object.keys(fila);
    for (const n of nombres) {
      if (claves.includes(n)) return fila[n];
    }
    for (const n of nombres) {
      const parcial = claves.find((k) => k.startsWith(n));
      if (parcial) return fila[parcial];
    }
    return "";
  }

  /*
   * Trae una pestania como lista de objetos { "titulo": ..., "precio": ... }.
   *
   * Si la pestania no existe, Google devuelve la PRIMERA de la planilla (la
   * de Instrucciones). Por eso se exige que esten las columnas esperadas:
   * si no estan, se devuelve null y esa seccion queda como estaba.
   */
  async function pestania(nombre, requeridas) {
    const url =
      "https://docs.google.com/spreadsheets/d/" +
      PLANILLA_ID +
      "/gviz/tq?tqx=out:csv&headers=1&sheet=" +
      encodeURIComponent(nombre);

    const control = new AbortController();
    const espera = setTimeout(() => control.abort(), 8000);
    try {
      const r = await fetch(url, { signal: control.signal, cache: "no-store" });
      const texto = await r.text();
      // Sin permiso, Google devuelve una pagina de login en vez del CSV.
      if (!r.ok || texto.trim().startsWith("<")) return null;

      const filas = leerCsv(texto);
      // La fila de titulos puede no ser la primera: arriba hay una nota.
      const iCabecera = filas.findIndex((f) => {
        const c = f.map(normalizar);
        return requeridas.every((req) => c.some((x) => x.startsWith(req)));
      });
      if (iCabecera === -1) return null;

      const claves = filas[iCabecera].map(normalizar);
      return filas
        .slice(iCabecera + 1)
        .map((f) => Object.fromEntries(claves.map((k, i) => [k, (f[i] || "").trim()])))
        .filter((o) => Object.values(o).some(Boolean));
    } catch (e) {
      return null;
    } finally {
      clearTimeout(espera);
    }
  }

  // ---------- Animaciones ----------
  //
  // Las secciones arrancan invisibles (.fade-in tiene opacity: 0) y se
  // muestran al scrollear. El observador de index.html ya recorrio la
  // pagina antes de que llegue la planilla, asi que lo que se agregue
  // despues necesita su propio observador o queda invisible para siempre.
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observador.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );

  function animar(contenedor) {
    contenedor.querySelectorAll(".fade-in, .fade-in-left, .fade-in-right").forEach((el) => {
      if (!el.classList.contains("visible")) observador.observe(el);
    });
  }

  const linkWhatsapp = (texto) =>
    "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);

  // Deja el precio como "$50.000" venga como venga de la planilla
  // ("50000", "$50.000", "50.000").
  function precio(bruto) {
    const limpio = String(bruto || "").replace(/[^0-9]/g, "");
    if (!limpio) return "";
    return "$" + Number(limpio).toLocaleString("es-AR");
  }

  // ---------- Promos ----------
  function pintarPromos(filas) {
    const grilla = document.querySelector(".promos-grid");
    if (!grilla) return;

    const promos = filas
      .map((f) => ({
        titulo: valor(f, "titulo", "nombre"),
        descripcion: valor(f, "descripcion"),
        antes: precio(valor(f, "precio anterior", "antes")),
        ahora: precio(valor(f, "precio")),
        etiqueta: valor(f, "etiqueta") || "PROMO",
        destacada: normalizar(valor(f, "destacada")).startsWith("si"),
      }))
      .filter((p) => p.titulo);
    if (!promos.length) return;

    grilla.innerHTML = promos
      .map(
        (p) => `
      <div class="promo-card${p.destacada ? " featured-promo" : ""}">
        <div class="promo-tag-top${p.destacada ? " destacado" : ""}">${esc(p.etiqueta)}</div>
        <div class="promo-icon"></div>
        <h3>${esc(p.titulo)}</h3>
        <p class="promo-desc">${esc(p.descripcion)}</p>
        <div class="promo-precio">
          ${p.antes ? `<span class="precio-tachado">${esc(p.antes)}</span>` : ""}
          <span class="precio-final">${esc(p.ahora)}</span>
        </div>
        <a href="${esc(linkWhatsapp("Hola, quiero consultar por la promo " + p.titulo))}"
           target="_blank" class="btn-promo">Quiero esta promo &rarr;</a>
      </div>`
      )
      .join("");
    animar(grilla);
  }

  // ---------- Tratamientos ----------
  function pintarTratamientos(filas) {
    const contenedor = document.querySelector(".tratamientos-inner");
    if (!contenedor) return;

    // Se agrupan por categoria, en el orden en que aparecen en la planilla.
    const categorias = new Map();
    filas.forEach((f) => {
      const categoria = valor(f, "categoria", "grupo");
      const nombre = valor(f, "nombre", "tratamiento", "titulo");
      if (!categoria || !nombre) return;
      if (!categorias.has(categoria)) categorias.set(categoria, []);
      categorias.get(categoria).push({ nombre, descripcion: valor(f, "descripcion") });
    });
    if (!categorias.size) return;

    contenedor.querySelectorAll(".trat-acord").forEach((n) => n.remove());

    let i = 0;
    categorias.forEach((tratamientos, categoria) => {
      i++;
      const numero = String(i).padStart(2, "0");
      const bloque = document.createElement("div");
      bloque.className = "trat-acord fade-in";
      bloque.innerHTML = `
        <button class="acord-btn" onclick="toggleAcord(this)">
          <div class="acord-left">
            <span class="acord-num">${numero}</span>
            <span class="acord-title">${esc(categoria)}</span>
          </div>
          <span class="acord-icon">+</span>
        </button>
        <div class="acord-body">
          <div class="trat-grid">
            ${tratamientos
              .map(
                (t) =>
                  `<div class="trat-card"><h4>${esc(t.nombre)}</h4><p>${esc(
                    t.descripcion
                  )}</p><a href="#turnos" class="trat-link">Reservar &rarr;</a></div>`
              )
              .join("")}
          </div>
          <a href="${GUIA}" target="_blank" class="cat-link">Ver gu&iacute;a completa &rarr;</a>
        </div>`;
      contenedor.appendChild(bloque);
    });

    animar(contenedor);
    actualizarSelectDeTurnos(categorias);
  }

  // El desplegable del formulario de turnos se arma con los mismos
  // tratamientos: si no, un tratamiento nuevo no se podria reservar.
  function actualizarSelectDeTurnos(categorias) {
    const select = document.querySelector('#turnos select[name="servicio"]');
    if (!select) return;

    const primera = select.querySelector("option[disabled]");
    select.innerHTML = "";
    if (primera) select.appendChild(primera);

    categorias.forEach((tratamientos, categoria) => {
      const grupo = document.createElement("optgroup");
      grupo.label = categoria;
      tratamientos.forEach((t) => {
        const op = document.createElement("option");
        op.value = t.nombre;
        op.textContent = t.nombre;
        grupo.appendChild(op);
      });
      select.appendChild(grupo);
    });
  }

  // ---------- Productos ----------
  function pintarProductos(filas) {
    const grilla = document.querySelector(".prod-grid");
    if (!grilla) return;

    // Las fotos siguen viviendo en la web, no en la planilla: se buscan por
    // el nombre del producto. Un producto nuevo aparece sin foto.
    const fotos = new Map();
    grilla.querySelectorAll(".prod-card").forEach((card) => {
      const nombre = card.querySelector("h4");
      const img = card.querySelector(".prod-img-wrap img");
      if (nombre && img) fotos.set(normalizar(nombre.textContent), img.getAttribute("src"));
    });

    const productos = filas
      .map((f) => ({
        categoria: valor(f, "categoria"),
        nombre: valor(f, "nombre", "producto", "titulo"),
        descripcion: valor(f, "descripcion"),
      }))
      .filter((p) => p.nombre);
    if (!productos.length) return;

    grilla.innerHTML = productos
      .map((p) => {
        const foto = fotos.get(normalizar(p.nombre));
        return `
      <div class="prod-card${foto ? "" : " sin-foto"}">
        ${foto ? `<div class="prod-img-wrap"><img src="${esc(foto)}" alt="${esc(p.nombre)}"></div>` : ""}
        <div class="prod-info">
          <span class="prod-cat">${esc(p.categoria)}</span>
          <h4>${esc(p.nombre)}</h4>
          <p>${esc(p.descripcion)}</p>
          <a href="${esc(linkWhatsapp("Hola, quiero consultar por el producto " + p.nombre))}"
             target="_blank" class="prod-btn">Consultar &rarr;</a>
        </div>
      </div>`;
      })
      .join("");
    animar(grilla);
  }

  // ---------- Preguntas frecuentes ----------
  function pintarFaq(filas) {
    const lista = document.querySelector(".faq-list");
    if (!lista) return;

    const preguntas = filas
      .map((f) => ({
        pregunta: valor(f, "pregunta"),
        respuesta: valor(f, "respuesta"),
      }))
      .filter((p) => p.pregunta && p.respuesta);
    if (!preguntas.length) return;

    lista.innerHTML = preguntas
      .map(
        (p) => `
      <div class="faq-item">
        <button class="faq-btn" onclick="toggleFaq(this)">${esc(p.pregunta)}<span class="faq-icon">+</span></button>
        <div class="faq-resp"><p>${esc(p.respuesta)}</p></div>
      </div>`
      )
      .join("");
    animar(lista);
  }

  // ---------- Frases sueltas ----------
  //
  // Cada fila de la pestania "Textos" apunta a un lugar de la pagina. La
  // columna "Donde" es lo que lee Lucia; el selector de al lado es donde se
  // escribe. Una fila con un "Donde" que no este en esta lista se ignora.
  const LUGARES = {
    "frase del inicio": ".hero-content > p",
    "sobre mi presentacion": ".sobre-texto p:nth-of-type(1)",
    "sobre mi segundo parrafo": ".sobre-texto p:nth-of-type(2)",
    "anios de experiencia": ".sobre-badge .badge-num",
    "subtitulo de productos": "#productos .section-sub",
    "subtitulo de preguntas frecuentes": "#faq .sub-light",
  };

  function pintarTextos(filas) {
    filas.forEach((f) => {
      const donde = normalizar(valor(f, "donde", "lugar"));
      const texto = valor(f, "texto", "contenido");
      const selector = LUGARES[donde];
      if (!selector || !texto) return;
      const nodo = document.querySelector(selector);
      if (nodo) nodo.textContent = texto;
    });
  }

  // ---------- Arranque ----------
  //
  // Las cinco pestanias se piden en paralelo y cada seccion se actualiza
  // por su cuenta: que una falle no afecta a las demas.
  Promise.all([
    pestania("Promos", ["titulo", "precio"]),
    pestania("Tratamientos", ["categoria", "nombre"]),
    pestania("Productos", ["nombre", "descripcion"]),
    pestania("Preguntas frecuentes", ["pregunta", "respuesta"]),
    pestania("Textos", ["donde", "texto"]),
  ]).then(([promos, tratamientos, productos, faq, textos]) => {
    try { if (promos) pintarPromos(promos); } catch (e) { console.warn("promos:", e); }
    try { if (tratamientos) pintarTratamientos(tratamientos); } catch (e) { console.warn("tratamientos:", e); }
    try { if (productos) pintarProductos(productos); } catch (e) { console.warn("productos:", e); }
    try { if (faq) pintarFaq(faq); } catch (e) { console.warn("faq:", e); }
    try { if (textos) pintarTextos(textos); } catch (e) { console.warn("textos:", e); }
  });
})();
