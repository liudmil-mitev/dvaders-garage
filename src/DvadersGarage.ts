import { LitElement, html, css, property, query, customElement } from '@lion/core';
import '@lion/tabs/define';
import '@lion/select/define';
import { parseWarehouseList, DvaderWarehouse } from './models/DvaderWarehouseModel';
import { sortedListByAttribute, sortedVehiclesByDate, DvaderVehicle } from './models/DvaderVehicleModel';

import { OverlayMixin, withModalDialogConfig } from '@lion/overlays';

@customElement("dvader-vehicle-details-overlay")
class DVaderVehicleDetailsOverlay extends OverlayMixin(LitElement) {
  opened = false;

  _defineOverlayConfig() {
    return {
      ...withModalDialogConfig(),
    };
  }

  __toggle() {
      this.opened = !this.opened;
  }

  _setupOpenCloseListeners() {
    super._setupOpenCloseListeners();

    if (this._overlayInvokerNode) {
      this._overlayInvokerNode.addEventListener('click', this.__toggle);
    }
  }

  _teardownOpenCloseListeners() {
    super._teardownOpenCloseListeners();

    if (this._overlayInvokerNode) {
      this._overlayInvokerNode.removeEventListener('click', this.__toggle);
    }
  }

  render() {
    return html`
      <slot name="invoker"></slot>
      <div id="overlay-content-node-wrapper">
        <slot name="content"></slot>
      </div>
    `;
  }
}

export class DvadersGarage extends LitElement {
  @property({ type: String, reflect: true })
  src = "";

  @property({ type: Array })
  warehouses:DvaderWarehouse[] = [];

  @property({type: Object})
  dialog!:DVaderVehicleDetailsOverlay;

  static styles = css`
    :host {
    }
  `;

  @query("#dialogOpen")
  dialogOpen!:HTMLElement;

  @query("#dialogContent")
  dialogContent!:HTMLElement;

  async firstUpdated() {
    if (this.src) {
      const response = await fetch(this.src);
      const warehouses = parseWarehouseList(await response.json());

      // Default sorting by date
      warehouses.forEach(warehouse => {
        warehouse.cars.vehicles = sortedVehiclesByDate(warehouse.cars.vehicles, "asc");
      });
      this.warehouses = warehouses;
    }
  }

  sortingChangeHandler(e:any) {
    const select = e.target;
    if (select) {
      const tab = parseInt(select.name.replace("sortby-tab-", ""), 10);
      const [ value, direction ] = select.value.split("-");
      
      if (value !== "date") {
        this.warehouses[tab].cars.vehicles = sortedListByAttribute(this.warehouses[tab].cars.vehicles, value, direction);
      } else {
        this.warehouses[tab].cars.vehicles = sortedVehiclesByDate(this.warehouses[tab].cars.vehicles, direction);
      }
      this.requestUpdate();
    }
  }

  handleVehicleCardClick(e:any) {
    if (e.currentTarget.dataset.licensed, this) {
      this.dialog = new DVaderVehicleDetailsOverlay;
    }
  }

  _generateVehicleCards(vehicles:DvaderVehicle[]) {
    // Generate vehicle card markup with microdata
    return vehicles.map((vehicle, i) => {
      return html`<dvader-vehicle-card 
        @click="${this.handleVehicleCardClick}"
        itemscope
        itemtype="https://schema.org/Product"
        data-licensed="${vehicle.licensed}"
        data-index="${i}"
        data-id="${vehicle._id}">
          <span itemprop="manufacturer" slot="vehicle-make">${vehicle.make}</span>
          <span itemprop="model" slot="vehicle-model">${vehicle.model}</span>
          <span itemprop="releaseDate" slot="vehicle-year-model">${vehicle.year_model}</span>
          <span itemprop="purchaseDate" slot="vehicle-date-added">${vehicle.date_added.toLocaleDateString()}</span>
          <span itemprop="priceCurrency" content="USD" slot="vehicle-price-currency">$</span>
          <span itemprop="price" content="${vehicle.price}" slot="vehicle-price">${vehicle.price}</span>
        </dvader-vehicle-card>`
    })
  }

  _generateWarehouseTabs(warehouses:DvaderWarehouse[]) {
    return warehouses.map((warehouse, i) => {
      return html`
        <button slot="tab">${warehouse.name}</button>
        <div slot="panel">
          <lion-select name="sortby-tab-${i}" label="Sort by">
            <select slot="input">
              <option selected value="date-asc">Date Asc</option>
              <option value="date-dsc">Date Desc</option>
              <option value="price-asc">Price Asc</option>
              <option value="price-dsc">Price Desc</option>
              <option value="year_model-asc">Year Asc</option>
              <option value="year_model-dsc">Year Desc</option>
            </select>
          </lion-select>
          <dvader-grid-gallery current="1" size="12" columns="3">
            ${this._generateVehicleCards(warehouse.cars.vehicles)}
          </dvader-grid-gallery>
        </div>
      `;
    });
  }

  render() {
    return html`
      ${this.dialog ? this.dialog.render() : ""}
      <h1 role="heading" aria-level="1">Anakin Skywalker's garage</h1>
      <h3 role="heading" aria-level="2">Used cars... and more!</h3>
      <lion-tabs @change="${this.sortingChangeHandler}">
        ${this._generateWarehouseTabs(this.warehouses)}
      </lion-tabs>
    `;
  }
}
