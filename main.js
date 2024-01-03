import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import Select from 'ol/interaction/Select';
import Overlay from 'ol/Overlay';

const baseMapLayer = new TileLayer({
  source: new OSM(),
});

const vectorLayer = new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON(),
    url: './data/smkjatim.json',
    projection: 'EPSG:4326',
  }),
  style: new Style({
    image: new Circle({
      radius: 6,
      fill: new Fill({ color: 'red' }),
      stroke: new Stroke({ color: 'white', width: 2 }),
    }),
  }),
});

const map = new Map({
  target: 'map-container',
  layers: [baseMapLayer, vectorLayer],
  view: new View({
    center: fromLonLat([112.2381, -7.5361]),
    zoom: 8,
  }),
});

vectorLayer.getSource().on('change', function (event) {
  if (vectorLayer.getSource().getState() === 'error') {
    console.error('Error loading GeoJSON');
  } else {
    // Once the GeoJSON is loaded, populate the table
    populateTable();
  }
});

const select = new Select({
  layers: [vectorLayer],
  condition: (event) => {
    return event.type === 'pointermove';
  },
});

map.addInteraction(select);

const popup = new Overlay({
  element: document.getElementById('popup')
});

map.addOverlay(popup);

map.on('pointermove', function (event) {
  const features = map.getFeaturesAtPixel(event.pixel);

  if (features.length > 0) {
    const feature = features[0];
    const coordinates = feature.getGeometry().getCoordinates();
    const name = feature.get('name');

    popup.setPosition(coordinates);

    const popupContent = `
      <strong>${name}</strong><br>
    `;

    document.getElementById('popup-content').innerHTML = popupContent;
    popup.getElement().style.display = 'block';
  } else {
    popup.getElement().style.display = 'none';
  }
});

document.getElementById('popup-closer').addEventListener('click', function () {
  popup.getElement().style.display = 'none';
});

// Function to populate the table with SMK data
function populateTable() {
  const tableBody = document.querySelector('#smk-table tbody');
  const searchInput = document.querySelector('#search-input');

  // Get features from the GeoJSON source
  const features = vectorLayer.getSource().getFeatures();

  // Items per page (you can adjust this value)
  const itemsPerPage = 15;

  // Calculate the total number of pages
  const totalPages = Math.ceil(features.length / itemsPerPage);

  // Create a pagination container
  const paginationContainer = document.createElement('div');
  paginationContainer.id = 'pagination-container';

  // Append the pagination container after the table
  document.getElementById('table-container').appendChild(paginationContainer);

  // Initial display (page 1)
  displayPage(features, 1, itemsPerPage);

  // Add event listener for search input
  searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim().toLowerCase();
    const filteredFeatures = features.filter((feature) => {
      const name = feature.get('name').toLowerCase();
      return name.includes(query);
    });

    // Update the table with the filtered features
    displayPage(filteredFeatures, 1, itemsPerPage);
  });
}

// Function to display features for the current page
function displayPage(features, currentPage, itemsPerPage) {
  const tableBody = document.querySelector('#smk-table tbody');

  // Clear existing table rows
  tableBody.innerHTML = '';

  // Calculate start and end indices for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Iterate through features and populate the table for the current page
  for (let i = startIndex; i < endIndex && i < features.length; i++) {
    const feature = features[i];
    const name = feature.get('name');
    const coordinates = feature.getGeometry().getCoordinates();

    // Create a new row
    const row = tableBody.insertRow();

    // Insert cells with SMK name and button
    const nameCell = row.insertCell(0);
    nameCell.textContent = name;

    const locationCell = row.insertCell(1);
    const locationButton = document.createElement('button');
    locationButton.textContent = 'Lihat Lokasi';
    locationButton.addEventListener('click', function () {
      // Show popup when the button is clicked
      popup.setPosition(coordinates);

      const popupContent = `
        <strong>${name}</strong><br>
      `;

      document.getElementById('popup-content').innerHTML = popupContent;
      popup.getElement().style.display = 'block';
    });

    locationCell.appendChild(locationButton);
  }

  // Remove existing pagination elements
  const paginationContainer = document.getElementById('pagination-container');
  paginationContainer.innerHTML = '';

  const totalPages = Math.ceil(features.length / itemsPerPage);

  // Create "First" button
  const firstButton = document.createElement('button');
  firstButton.textContent = 'First';
  firstButton.addEventListener('click', function () {
    if (currentPage !== 1) {
      displayPage(features, 1, itemsPerPage);
    }
  });

  paginationContainer.appendChild(firstButton);

  // Create "Prev" button
  const prevButton = document.createElement('button');
  prevButton.textContent = 'Prev';
  prevButton.addEventListener('click', function () {
    if (currentPage > 1) {
      displayPage(features, currentPage - 1, itemsPerPage);
    }
  });

  paginationContainer.appendChild(prevButton);

  // Create page number buttons with ellipsis
  const MAX_PAGES_DISPLAYED = 5; // Number of page numbers to display
  let startPage = Math.max(1, currentPage - Math.floor(MAX_PAGES_DISPLAYED / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGES_DISPLAYED - 1);

  if (endPage - startPage + 1 < MAX_PAGES_DISPLAYED) {
    startPage = Math.max(1, endPage - MAX_PAGES_DISPLAYED + 1);
  }

  // Display ellipsis before page numbers if needed
  if (startPage > 1) {
    const ellipsisBefore = document.createElement('span');
    ellipsisBefore.textContent = '...';
    paginationContainer.appendChild(ellipsisBefore);
  }

  // Display page numbers
  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.addEventListener('click', function () {
      displayPage(features, i, itemsPerPage);
    });

    // Add a class to the current page button
    if (i === currentPage) {
      button.classList.add('current-page');
    }

    paginationContainer.appendChild(button);
  }

  // Display ellipsis after page numbers if needed
  if (endPage < totalPages) {
    const ellipsisAfter = document.createElement('span');
    ellipsisAfter.textContent = '...';
    paginationContainer.appendChild(ellipsisAfter);
  }

  // Create "Next" button
  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next';
  nextButton.addEventListener('click', function () {
    if (currentPage < totalPages) {
      displayPage(features, currentPage + 1, itemsPerPage);
    }
  });

  paginationContainer.appendChild(nextButton);

  // Create "Last" button
  const lastButton = document.createElement('button');
  lastButton.textContent = 'Last';
  lastButton.addEventListener('click', function () {
    if (currentPage !== totalPages) {
      displayPage(features, totalPages, itemsPerPage);
    }
  });

  paginationContainer.appendChild(lastButton);
}
