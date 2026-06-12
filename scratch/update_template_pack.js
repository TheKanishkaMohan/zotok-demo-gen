const fs = require('fs');

const packPath = 'template-pack.json';
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

// 1. Add/Update journeyDescriptions
pack.journeyDescriptions = pack.journeyDescriptions || {};
pack.journeyDescriptions.van_sales = {
  "title": "Van Sales",
  "desc": "Clock-in & load trip stock, beat route check-in, ordering quick actions, and Clock-out reconciliation report.",
  "steps": 3
};

// 2. Add/Update journeyScreens
pack.journeyScreens = pack.journeyScreens || {};
pack.journeyScreens.van_sales = "{{> step1-van-sales}}\n{{> step2-van-sales}}\n{{> step3-van-sales}}";

// 3. Add/Update defaultJourneyData
pack.defaultJourneyData = pack.defaultJourneyData || {};
pack.defaultJourneyData.van_sales = {
  "id": "van_sales",
  "title": "Van Sales Journey",
  "brand": "{{brand.id}}",
  "stock": {
    "menthol": "0",
    "lavender": "10",
    "aloe": "0",
    "sandal": "0",
    "heat_powder": "0",
    "soap": "0"
  },
  "screens": [
    {
      "id": "step1-van-sales",
      "type": "step1-van-sales"
    },
    {
      "id": "step2-van-sales",
      "type": "step2-van-sales"
    },
    {
      "id": "step3-van-sales",
      "type": "step3-van-sales"
    }
  ],
  "navSteps": [
    "step-1",
    "step-2",
    "step-3"
  ],
  "steps": [
    {
      "num": 1,
      "displayNum": 1,
      "title": "Clock In & Trip Stock Entry",
      "meta": "Sales Rep · Load stock carried",
      "navTitle": "Step 1 — Clock In &amp; Trip Stock",
      "navDesc": "<span style=\"color:#555;font-size:12px;\">Sales representative clocks in and registers the trip stock to carry for secondary sales.</span><span class=\"tag tag-ops\">Field Ops</span><span class=\"tag tag-stock\">Trip Stock</span>"
    },
    {
      "num": 2,
      "displayNum": 2,
      "title": "Routes & Check-In",
      "meta": "Sales Rep · Routes, check-in, ordering",
      "navTitle": "Step 2 — Routes &amp; Check-In",
      "navDesc": "<span style=\"color:#555;font-size:12px;\">Beat navigation, geofenced customer check-in, and ordering quick actions.</span><span class=\"tag tag-ops\">Field Ops</span><span class=\"tag tag-route\">Routes</span>"
    },
    {
      "num": 3,
      "displayNum": 3,
      "title": "Clock Out & Reconciliation",
      "meta": "Sales Rep · Clock out and stock report",
      "navTitle": "Step 3 — Clock Out &amp; Reconciliation",
      "navDesc": "<span style=\"color:#555;font-size:12px;\">Day end clock-out and remaining stock reconciliation.</span><span class=\"tag tag-ops\">Field Ops</span><span class=\"tag tag-stock\">Reconciliation</span>"
    }
  ],
  "hubMeta": {
    "emoji": "🚚",
    "color": "#d3002b",
    "tags": [
      "Field Ops",
      "Trip Stock",
      "Attendance"
    ]
  }
};

// 4. Initialize partial keys so sync script finds them
pack.partials = pack.partials || {};
pack.partials['step1-van-sales'] = pack.partials['step1-van-sales'] || "";
pack.partials['step2-van-sales'] = pack.partials['step2-van-sales'] || "";
pack.partials['step3-van-sales'] = pack.partials['step3-van-sales'] || "";

// Clean up old step4 key from partials
delete pack.partials['step4-van-sales'];

fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf8');
console.log('Successfully updated template-pack.json with 3-step van_sales metadata!');
