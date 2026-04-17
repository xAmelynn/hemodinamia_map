const mapa = L.map('mapa', {
  zoomControl: true
}).setView([23.6345, -102.5528], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

let datosGeojson = null;
let capaMarcadores = null;
let marcadorActivo = null;
let featureActiva = null;
let cluesSeleccionado = null;

const filtroInstitucion = document.getElementById('filtroInstitucion');
const filtroEntidad = document.getElementById('filtroEntidad');
const filtroMunicipio = document.getElementById('filtroMunicipio');
const filtroTipoUnidad = document.getElementById('filtroTipoUnidad');

const panelFiltros = document.getElementById('panel-filtros');
const btnToggleFiltros = document.getElementById('btnToggleFiltros');
const btnAbrirFiltros = document.getElementById('btnAbrirFiltros');
const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
const detalleContenido = document.getElementById('detalle-contenido');
const contadorUnidades = document.getElementById('contadorUnidades');
const leyendaInstituciones = document.getElementById('leyendaInstituciones');

function obtenerRutaPin(sigla) {
  switch (sigla) {
    case 'IMSS':
      return 'img/IMSS.svg';
    case 'ISSSTE':
      return 'img/ISSSTE.svg';
    case 'PEMEX':
      return 'img/PEMEX.svg';
    case 'SEDENA':
      return 'img/SEDENA.svg';
    case 'SEMAR':
      return 'img/SEMAR.svg';
    case 'SESA':
      return 'img/SESA.svg';
    case 'SMU':
      return 'img/SMU.svg';
    case 'SSA':
      return 'img/SSA.svg';
    case 'SNTE':
      return 'img/SNTE.svg';
    case 'CCINSHAE':
      return 'img/CCINSHAE.svg';
    case 'BIENESTAR':
    case 'IMSS-Bienestar':
    case 'IMSS-BIENESTAR':
      return 'img/BIENESTAR.svg';
    default:
      return 'img/SSA.svg';
  }
}

function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizarTexto(valor, fallback = 'No disponible') {
  if (valor === null || valor === undefined || valor === '') return fallback;
  return escapeHtml(valor);
}

function obtenerValoresUnicos(features, campo) {
  return [...new Set(
    features
      .map(f => f.properties[campo])
      .filter(v => v !== null && v !== undefined && v !== '')
  )].sort((a, b) => String(a).localeCompare(String(b), 'es'));
}

function llenarSelect(select, valores, textoTodos) {
  select.innerHTML = `<option value="">${textoTodos}</option>`;

  valores.forEach(valor => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });
}

function actualizarMunicipios() {
  if (!datosGeojson) return;

  const entidadSeleccionada = filtroEntidad.value;
  let featuresFiltradas = datosGeojson.features;

  if (entidadSeleccionada) {
    featuresFiltradas = featuresFiltradas.filter(
      f => f.properties['Entidad'] === entidadSeleccionada
    );
  }

  const municipios = obtenerValoresUnicos(featuresFiltradas, 'Municipio');
  llenarSelect(filtroMunicipio, municipios, 'Todos');
}

function crearIconoPersonalizado(sigla, salas, seleccionado = false) {
  const rutaPin = obtenerRutaPin(sigla);

  return L.divIcon({
    className: 'icono-personalizado',
    html: `
      <div class="pin-contenedor ${seleccionado ? 'seleccionado' : ''}">
        <img src="${rutaPin}" alt="${escapeHtml(sigla)}" class="pin-svg">
        <div class="badge-pin">${escapeHtml(salas)}</div>
      </div>
    `,
    iconSize: [38, 50],
    iconAnchor: [19, 50]
  });
}

function obtenerURLRuta(feature) {
  const coords = feature.geometry.coordinates;
  const longitud = coords[0];
  const latitud = coords[1];
  return `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
}

function generarLeyenda(features) {
  const siglas = obtenerValoresUnicos(features, 'Sigla de la Institución');

  leyendaInstituciones.innerHTML = siglas.map(sigla => `
    <div class="leyenda-item">
      <img
        src="${obtenerRutaPin(sigla)}"
        alt="${escapeHtml(sigla)}"
        style="width:18px; height:24px; object-fit:contain;"
      >
      <span>${escapeHtml(sigla)}</span>
    </div>
  `).join('');
}

function mostrarDetalle(feature) {
  featureActiva = feature;

  const props = feature.properties;
  const observaciones = (props['Observaciones'] || '').trim();
  const hayObservacion = observaciones && observaciones.toLowerCase() !== 'no aplica';
  const urlRuta = obtenerURLRuta(feature);

  detalleContenido.innerHTML = `
    <div class="tarjeta-unidad">
      <div class="tarjeta-encabezado">
        <h3 class="tarjeta-titulo">${normalizarTexto(props['Unidad Médica'], 'Sin nombre')}</h3>
        <p class="tarjeta-subtitulo">${normalizarTexto(props['Institución'])}</p>

        <div class="tarjeta-chip-group">
          <span class="tarjeta-chip">CLUES: ${normalizarTexto(props['Clues'])}</span>
          <span class="tarjeta-chip">Nivel: ${normalizarTexto(props['Nivel de Atención'])}</span>
          <span class="tarjeta-chip">Salas: ${normalizarTexto(props['Cantidad de salas'], '0')}</span>
        </div>
      </div>

      <div class="tarjeta-seccion">
        <h3>Información general</h3>
        <div class="fila-dato"><strong>Entidad:</strong> ${normalizarTexto(props['Entidad'])}</div>
        <div class="fila-dato"><strong>Municipio:</strong> ${normalizarTexto(props['Municipio'])}</div>
        <div class="fila-dato"><strong>Tipo de unidad:</strong> ${normalizarTexto(props['Tipo de Unidad'])}</div>
        <div class="fila-dato"><strong>Siglas del tipo:</strong> ${normalizarTexto(props['Siglas del tipo de unidad'])}</div>
        <div class="fila-dato"><strong>Sigla de la institución:</strong> ${normalizarTexto(props['Sigla de la Institución'])}</div>
      </div>

      <div class="tarjeta-seccion">
        <h3>Hemodinamia</h3>
        <div class="fila-dato">
          <strong>Cantidad de salas:</strong>
          <span class="badge-salas">${normalizarTexto(props['Cantidad de salas'], '0')}</span>
        </div>
      </div>

      <div class="tarjeta-seccion">
        <h3>Ubicación</h3>
        <div class="fila-dato"><strong>Dirección:</strong> ${normalizarTexto(props['Direccion'])}</div>
        <div class="fila-dato">
          <strong>Coordenadas:</strong>
          ${feature.geometry.coordinates[1].toFixed(6)}, ${feature.geometry.coordinates[0].toFixed(6)}
        </div>
      </div>

      ${hayObservacion ? `
        <div class="alerta-observacion">
          <strong>Observaciones:</strong> ${escapeHtml(observaciones)}
        </div>
      ` : ''}

      <a class="btn-ruta" href="${urlRuta}" target="_blank" rel="noopener noreferrer">
        Cómo llegar
      </a>
    </div>
  `;
}

function limpiarDetalle() {
  featureActiva = null;
  detalleContenido.innerHTML = `
    <div class="estado-vacio">
      <div class="estado-vacio-icono">⌖</div>
      <p>Selecciona una unidad en el mapa para ver su información.</p>
    </div>
  `;
}

function resetearMarcadorActivo() {
  if (!marcadorActivo) return;

  const feature = marcadorActivo.feature;
  const props = feature.properties;

  marcadorActivo.setIcon(
    crearIconoPersonalizado(
      props['Sigla de la Institución'],
      props['Cantidad de salas'] || 1,
      false
    )
  );
}

function activarMarcador(layer) {
  resetearMarcadorActivo();
  marcadorActivo = layer;

  const props = layer.feature.properties;

  layer.setIcon(
    crearIconoPersonalizado(
      props['Sigla de la Institución'],
      props['Cantidad de salas'] || 1,
      true
    )
  );
}

function aplicarFiltros() {
  if (!datosGeojson) return;

  const institucion = filtroInstitucion.value;
  const entidad = filtroEntidad.value;
  const municipio = filtroMunicipio.value;
  const tipoUnidad = filtroTipoUnidad.value;

  const filtrados = datosGeojson.features.filter(feature => {
    const props = feature.properties;

    return (
      (!institucion || props['Institución'] === institucion) &&
      (!entidad || props['Entidad'] === entidad) &&
      (!municipio || props['Municipio'] === municipio) &&
      (!tipoUnidad || props['Tipo de Unidad'] === tipoUnidad)
    );
  });

  contadorUnidades.textContent = filtrados.length;

  if (capaMarcadores) {
    mapa.removeLayer(capaMarcadores);
  }

  marcadorActivo = null;

  capaMarcadores = L.geoJSON(filtrados, {
    pointToLayer: function(feature, latlng) {
      const props = feature.properties;
      const sigla = props['Sigla de la Institución'];
      const salas = props['Cantidad de salas'] || 1;
      const esSeleccionado = (props['Clues'] || null) === cluesSeleccionado;

      const marker = L.marker(latlng, {
        icon: crearIconoPersonalizado(sigla, salas, esSeleccionado)
      });

      if (esSeleccionado) {
        marcadorActivo = marker;
      }

      return marker;
    },
    onEachFeature: function(feature, layer) {
      layer.on('click', function() {
        cluesSeleccionado = feature.properties['Clues'] || null;
        activarMarcador(layer);
        mostrarDetalle(feature);
      });
    }
  }).addTo(mapa);

  if (filtrados.length > 0) {
    mapa.fitBounds(capaMarcadores.getBounds(), { padding: [30, 30] });
  } else {
    limpiarDetalle();
  }

  if (featureActiva) {
    const coincidencia = filtrados.find(
      f => f.properties['Clues'] === featureActiva.properties['Clues']
    );

    if (!coincidencia) {
      cluesSeleccionado = null;
      limpiarDetalle();
    }
  }
}

function colapsarFiltros() {
  panelFiltros.classList.add('colapsado');
  btnAbrirFiltros.classList.remove('oculto');
  setTimeout(() => mapa.invalidateSize(), 280);
}

function abrirFiltros() {
  panelFiltros.classList.remove('colapsado');
  btnAbrirFiltros.classList.add('oculto');
  setTimeout(() => mapa.invalidateSize(), 280);
}

btnToggleFiltros.addEventListener('click', colapsarFiltros);
btnAbrirFiltros.addEventListener('click', abrirFiltros);

btnLimpiarFiltros.addEventListener('click', () => {
  filtroInstitucion.value = '';
  filtroEntidad.value = '';
  actualizarMunicipios();
  filtroMunicipio.value = '';
  filtroTipoUnidad.value = '';
  cluesSeleccionado = null;
  marcadorActivo = null;
  aplicarFiltros();
  limpiarDetalle();
});

filtroInstitucion.addEventListener('change', () => {
  cluesSeleccionado = null;
  aplicarFiltros();
  limpiarDetalle();
});

filtroEntidad.addEventListener('change', () => {
  actualizarMunicipios();
  filtroMunicipio.value = '';
  cluesSeleccionado = null;
  aplicarFiltros();
  limpiarDetalle();
});

filtroMunicipio.addEventListener('change', () => {
  cluesSeleccionado = null;
  aplicarFiltros();
  limpiarDetalle();
});

filtroTipoUnidad.addEventListener('change', () => {
  cluesSeleccionado = null;
  aplicarFiltros();
  limpiarDetalle();
});

fetch('data/hemodinamia.geojson')
  .then(response => response.json())
  .then(data => {
    datosGeojson = data;

    const instituciones = obtenerValoresUnicos(data.features, 'Institución');
    const entidades = obtenerValoresUnicos(data.features, 'Entidad');
    const tipos = obtenerValoresUnicos(data.features, 'Tipo de Unidad');

    llenarSelect(filtroInstitucion, instituciones, 'Todas');
    llenarSelect(filtroEntidad, entidades, 'Todas');
    llenarSelect(filtroTipoUnidad, tipos, 'Todos');

    generarLeyenda(data.features);
    actualizarMunicipios();
    aplicarFiltros();
    limpiarDetalle();
  })
  .catch(error => {
    console.error('Error al cargar el GeoJSON:', error);
  });
