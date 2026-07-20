import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";

// ----------------------------------------------------
// FIELD NAMES
// ----------------------------------------------------
export const lotstatisticField = "OBJECTID";
export const lotStatusField = "StatusNVS3";

// ----------------------------------------------------
// STATUS DEFINITIONS
// Shared status definitions — single source of truth for both
// the map renderer and the chart colors
// ----------------------------------------------------
export const lotStatuses = [
  { code: 1, label: "Paid",                        color: "#00734d" },
  { code: 2, label: "For Payment Processing",      color: "#0070ff" },
  { code: 3, label: "For Legal Pass",              color: "#ffff00" },
  { code: 4, label: "For Appraisal/Offer to Buy",  color: "#ffaa00" },
  { code: 5, label: "For Expro",                   color: "#FF0000" },
  { code: 6, label: "with WOP Fully Turned-over",  color: "#4e6b2f" },
  { code: 7, label: "ROWUA/TUA",                   color: "#70AD47" },
  { code: 8, label: "Signed ROWUA/TUA",            color: "#adc993" },
];

// ----------------------------------------------------
// RENDERER
// Colors each lot by StatusNVS3; features with no status (public land)
// fall through to defaultSymbol/defaultLabel.
// ----------------------------------------------------
const lotLayerRenderer = new UniqueValueRenderer({
  field: lotStatusField,
  uniqueValueInfos: lotStatuses.map(({ code, label, color }) => ({
    value: code,
    label: label,
    symbol: new SimpleFillSymbol({
      color,
      outline: {
        color: "#ffffff",
        width: 0.5,
      },
    }),
  })),
  // Public lots (null StatusNVS3) — gray hatch
  defaultSymbol: new SimpleFillSymbol({
    style: "backward-diagonal",
    color: "#d9d9d9",
    outline: {
      color: "#d9d9d9",
      width: 0.5,
    },
  }),
  defaultLabel: "Public Land",
});

// ----------------------------------------------------
// POPUP
// Shows Status, Package, Type, Station. StatusNVS3 already has a
// coded-value domain on the source service, so the popup auto-translates
// the raw code into its label (e.g. 3 -> "For Legal Pass") with no
// Arcade expression needed.
// ----------------------------------------------------
const lotPopupTemplate = new PopupTemplate({
  title: "{Package} — {Type}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "StatusNVS3", label: "Status" },
        { fieldName: "Package", label: "Package" },
        { fieldName: "Type", label: "Type" },
        { fieldName: "Station1", label: "Station" },
      ],
    },
  ],
});

// ----------------------------------------------------
// LAYERS
// ----------------------------------------------------
export const lotLayer = new FeatureLayer({
  portalItem: {
    id: "93790e8102f84713a69e562da12bb415",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["StatusNVS3", "HandedOVer", "not_yet", "Package", "Type", "Station1", "OBJECTID", "OWNER", "Id"],
  layerId: 31,
  title: "MMSP Land",
  renderer: lotLayerRenderer,
  popupTemplate: lotPopupTemplate,
  listMode: "show",
});

export const alignmentLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 2,
  title: "Alignment",
  opacity: 0.7,
  popupEnabled: false,
  listMode: "show",  
});

export const stationLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 1,
  title: "Stations",
  opacity: 1,
  popupEnabled: false,
  listMode: "hide",
});