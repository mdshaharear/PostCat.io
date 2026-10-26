import type { Brand, CanonicalProduct, Category, Merchant, Money, Offer, ProductImage, ProductVariant, ProductView } from "@/types/catalog";
import { createCategoryGraph } from "./category-taxonomy.ts";
import { electronicsCategories } from "./electronics-taxonomy.ts";

export const categories: Category[] = [
  { id:"cat-home", slug:"home", name:"Home & Living", description:"Furniture, kitchen, décor and everyday household essentials.", accent:"#e86546", icon:"⌂", searchTerms:["home","living","household"] },
  { id:"cat-electronics", slug:"electronics", name:"Electronics", description:"Personal tech, audio, computers, mobile and smart-home products.", accent:"#626bd9", icon:"◇", searchTerms:["electronics","tech","gadgets"] },
  { id:"cat-health-beauty", slug:"health-beauty", name:"Health & Beauty", description:"Wellness, personal care, skincare and fitness essentials.", accent:"#2f8f6a", icon:"✦", searchTerms:["health","beauty","wellness"] },
  { id:"cat-fashion", slug:"fashion", name:"Fashion", description:"Clothing, shoes, bags, watches and accessories.", accent:"#a45c7a", icon:"◐", searchTerms:["fashion","clothing","apparel"] },
  { id:"cat-sports-outdoors", slug:"sports-outdoors", name:"Sports & Outdoors", description:"Gear for training, travel, camping and outdoor activity.", accent:"#b77a2f", icon:"△", searchTerms:["sports","outdoors","camping"] },
  { id:"cat-baby-kids", slug:"baby-kids", name:"Baby & Kids", description:"Practical essentials for babies, children and parents.", accent:"#d17b63", icon:"○", searchTerms:["baby","kids","children"] },
  { id:"cat-pets", slug:"pets", name:"Pet Supplies", description:"Food, care, play and travel products for pets.", accent:"#7b6f55", icon:"●", searchTerms:["pets","dog","cat"] },
  { id:"cat-automotive", slug:"automotive", name:"Automotive", description:"Car care, accessories, tools and vehicle electronics.", accent:"#536878", icon:"▣", searchTerms:["automotive","car","vehicle"] },
  { id:"cat-office", slug:"office", name:"Office & School", description:"Workspaces, stationery, organization and school supplies.", accent:"#527a91", icon:"□", searchTerms:["office","school","stationery"] },
  { id:"cat-toys-games", slug:"toys-games", name:"Toys & Games", description:"Games, creative play, collectibles and family entertainment.", accent:"#b05e4f", icon:"✚", searchTerms:["toys","games","play"] },
  { id:"cat-grocery", slug:"grocery", name:"Grocery & Gourmet", description:"Pantry goods, beverages and specialty food discovery.", accent:"#7d8f45", icon:"✺", searchTerms:["grocery","food","beverages"] },
  { id:"cat-garden-tools", slug:"garden-tools", name:"Garden & Tools", description:"Garden, DIY, hardware and home-improvement equipment.", accent:"#4e7d5b", icon:"⌁", searchTerms:["garden","tools","diy"] },

  { id:"cat-kitchen-appliances", slug:"kitchen-appliances", name:"Kitchen Appliances", description:"Countertop appliances and practical cooking equipment.", accent:"#e86546", icon:"⌂", parentId:"cat-home", searchTerms:["kitchen appliances","cooking appliances"], googleProductCategory:"Home & Garden > Kitchen & Dining > Kitchen Appliances" },
  { id:"cat-coffee-makers", slug:"coffee-makers", name:"Coffee Makers", description:"Coffee brewers, espresso tools and preparation accessories.", accent:"#e86546", icon:"☕", parentId:"cat-kitchen-appliances", searchTerms:["coffee maker","coffee machine","brewer"], googleProductCategory:"Home & Garden > Kitchen & Dining > Kitchen Appliances > Coffee Makers & Espresso Machines" },
  { id:"cat-furniture", slug:"furniture", name:"Furniture", description:"Furniture for living, dining, work and sleep.", accent:"#e86546", icon:"⌂", parentId:"cat-home", searchTerms:["furniture","chairs","tables"], googleProductCategory:"Home & Garden > Furniture" },
  { id:"cat-home-decor", slug:"home-decor", name:"Home Décor", description:"Clocks, mirrors, accents and decorative objects.", accent:"#e86546", icon:"⌂", parentId:"cat-home", searchTerms:["home decor","clock","decoration"], googleProductCategory:"Home & Garden > Decor" },
  { id:"cat-lighting", slug:"lighting", name:"Lighting", description:"Task, ambient and decorative lighting.", accent:"#e86546", icon:"☼", parentId:"cat-home", searchTerms:["lighting","lamp","light"], googleProductCategory:"Home & Garden > Lighting" },
  { id:"cat-bedding-bath", slug:"bedding-bath", name:"Bedding & Bath", description:"Bedding, towels and bathroom essentials.", accent:"#e86546", icon:"⌂", parentId:"cat-home", searchTerms:["bedding","bath","towels"] },
  { id:"cat-storage-organization", slug:"storage-organization", name:"Storage & Organization", description:"Closet, kitchen and household organization products.", accent:"#e86546", icon:"▦", parentId:"cat-home", searchTerms:["storage","organization","organizer"], googleProductCategory:"Home & Garden > Household Supplies > Household Storage Supplies" },

  ...electronicsCategories,

  { id:"cat-skincare", slug:"skincare", name:"Skincare", description:"Cleansers, moisturizers and daily skincare.", accent:"#2f8f6a", icon:"✦", parentId:"cat-health-beauty", searchTerms:["skincare","face care","moisturizer"], googleProductCategory:"Health & Beauty > Personal Care > Cosmetics > Skin Care" },
  { id:"cat-hair-care", slug:"hair-care", name:"Hair Care", description:"Haircare tools, shampoo and styling products.", accent:"#2f8f6a", icon:"✦", parentId:"cat-health-beauty", searchTerms:["hair care","shampoo","styling"] },
  { id:"cat-personal-care", slug:"personal-care", name:"Personal Care", description:"Grooming, hygiene and personal-care essentials.", accent:"#2f8f6a", icon:"✦", parentId:"cat-health-beauty", searchTerms:["personal care","grooming","hygiene"], googleProductCategory:"Health & Beauty > Personal Care > Shaving & Grooming" },
  { id:"cat-fitness-yoga", slug:"fitness-yoga", name:"Fitness & Yoga", description:"Home fitness, yoga and movement equipment.", accent:"#2f8f6a", icon:"◇", parentId:"cat-health-beauty", searchTerms:["fitness","yoga","exercise mat"], googleProductCategory:"Sporting Goods > Exercise & Fitness > Yoga & Pilates" },
  { id:"cat-vitamins-supplements", slug:"vitamins-supplements", name:"Vitamins & Supplements", description:"Vitamins, minerals and nutritional supplements.", accent:"#2f8f6a", icon:"✦", parentId:"cat-health-beauty", searchTerms:["vitamins","supplements","nutrition"] },

  { id:"cat-womens-fashion", slug:"womens-fashion", name:"Women's Fashion", description:"Women's clothing, footwear and accessories.", accent:"#a45c7a", icon:"◐", parentId:"cat-fashion", searchTerms:["women fashion","women clothing"] },
  { id:"cat-mens-fashion", slug:"mens-fashion", name:"Men's Fashion", description:"Men's clothing, footwear and accessories.", accent:"#a45c7a", icon:"◐", parentId:"cat-fashion", searchTerms:["men fashion","men clothing"] },
  { id:"cat-shoes", slug:"shoes", name:"Shoes", description:"Casual, athletic and formal footwear.", accent:"#a45c7a", icon:"◐", parentId:"cat-fashion", searchTerms:["shoes","sneakers","footwear"], googleProductCategory:"Apparel & Accessories > Shoes" },
  { id:"cat-bags-luggage", slug:"bags-luggage", name:"Bags & Luggage", description:"Handbags, backpacks and travel luggage.", accent:"#a45c7a", icon:"▱", parentId:"cat-fashion", searchTerms:["bags","luggage","backpacks"], googleProductCategory:"Apparel & Accessories > Handbags, Wallets & Cases" },

  { id:"cat-camping-hiking", slug:"camping-hiking", name:"Camping & Hiking", description:"Shelter, cooking and trail essentials.", accent:"#b77a2f", icon:"△", parentId:"cat-sports-outdoors", searchTerms:["camping","hiking","trail"], googleProductCategory:"Sporting Goods > Outdoor Recreation > Camping & Hiking" },
  { id:"cat-outdoor-hydration", slug:"outdoor-hydration", name:"Outdoor Hydration", description:"Water bottles, flasks and hydration gear.", accent:"#b77a2f", icon:"◒", parentId:"cat-sports-outdoors", searchTerms:["water bottle","thermal bottle","hydration"], googleProductCategory:"Sporting Goods > Outdoor Recreation > Hydration Systems" },
  { id:"cat-backpacks", slug:"backpacks", name:"Backpacks", description:"Daypacks, hiking packs and travel backpacks.", accent:"#b77a2f", icon:"▱", parentId:"cat-sports-outdoors", searchTerms:["backpack","daypack","hiking bag"], googleProductCategory:"Luggage & Bags > Backpacks" },
  { id:"cat-cycling", slug:"cycling", name:"Cycling", description:"Bikes, helmets, accessories and maintenance gear.", accent:"#b77a2f", icon:"◎", parentId:"cat-sports-outdoors", searchTerms:["cycling","bike","bicycle"] },

  { id:"cat-baby-gear", slug:"baby-gear", name:"Baby Gear", description:"Strollers, carriers and travel essentials.", accent:"#d17b63", icon:"○", parentId:"cat-baby-kids", searchTerms:["baby gear","stroller","carrier"], googleProductCategory:"Baby & Toddler > Baby Transport > Baby Strollers" },
  { id:"cat-nursery", slug:"nursery", name:"Nursery", description:"Sleep, feeding and nursery organization.", accent:"#d17b63", icon:"○", parentId:"cat-baby-kids", searchTerms:["nursery","crib","baby room"] },
  { id:"cat-dog-supplies", slug:"dog-supplies", name:"Dog Supplies", description:"Food, care, toys and walking supplies for dogs.", accent:"#7b6f55", icon:"●", parentId:"cat-pets", searchTerms:["dog supplies","dog food","dog toys"], googleProductCategory:"Animals & Pet Supplies > Pet Supplies > Dog Supplies" },
  { id:"cat-cat-supplies", slug:"cat-supplies", name:"Cat Supplies", description:"Food, litter, care and play products for cats.", accent:"#7b6f55", icon:"●", parentId:"cat-pets", searchTerms:["cat supplies","cat food","cat litter"] },
  { id:"cat-car-accessories", slug:"car-accessories", name:"Car Accessories", description:"Interior, travel and convenience accessories.", accent:"#536878", icon:"▣", parentId:"cat-automotive", searchTerms:["car accessories","vehicle accessories"] },
  { id:"cat-car-electronics", slug:"car-electronics", name:"Car Electronics", description:"Dash cameras, chargers and in-car electronics.", accent:"#536878", icon:"▣", parentId:"cat-automotive", searchTerms:["car electronics","dash cam","car charger"], googleProductCategory:"Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Electronics" },
  { id:"cat-office-furniture", slug:"office-furniture", name:"Office Furniture", description:"Desks, chairs and workspace storage.", accent:"#527a91", icon:"□", parentId:"cat-office", searchTerms:["office furniture","desk","office chair"], googleProductCategory:"Furniture > Office Furniture" },
  { id:"cat-stationery", slug:"stationery", name:"Stationery", description:"Writing, paper and organization supplies.", accent:"#527a91", icon:"□", parentId:"cat-office", searchTerms:["stationery","notebook","pens"] },
  { id:"cat-board-games", slug:"board-games", name:"Board Games", description:"Strategy, family and party tabletop games.", accent:"#b05e4f", icon:"✚", parentId:"cat-toys-games", searchTerms:["board games","tabletop games"] },
  { id:"cat-learning-toys", slug:"learning-toys", name:"Learning Toys", description:"Creative, STEM and educational toys.", accent:"#b05e4f", icon:"✚", parentId:"cat-toys-games", searchTerms:["learning toys","educational toys","stem toys"] },
  { id:"cat-coffee-tea", slug:"coffee-tea", name:"Coffee & Tea", description:"Beans, tea, brewing ingredients and gift sets.", accent:"#7d8f45", icon:"☕", parentId:"cat-grocery", searchTerms:["coffee","tea","beverages"] },
  { id:"cat-snacks", slug:"snacks", name:"Snacks", description:"Savory, sweet and better-for-you snacks.", accent:"#7d8f45", icon:"✺", parentId:"cat-grocery", searchTerms:["snacks","food","grocery"] },
  { id:"cat-power-tools", slug:"power-tools", name:"Power Tools", description:"Corded and cordless tools for building and repair.", accent:"#4e7d5b", icon:"⌁", parentId:"cat-garden-tools", searchTerms:["power tools","drill","saw"], googleProductCategory:"Hardware > Tools > Power Tools" },
  { id:"cat-garden-care", slug:"garden-care", name:"Garden Care", description:"Plant care, watering and outdoor maintenance.", accent:"#4e7d5b", icon:"⌁", parentId:"cat-garden-tools", searchTerms:["garden care","watering","plants"] },
];

export const brands: Brand[] = [
  { id: "brand-north", name: "Northline" }, { id: "brand-kanso", name: "Kanso Works" },
  { id: "brand-field", name: "Field Note" }, { id: "brand-arc", name: "Arc Studio" },
  { id: "brand-soma", name: "Soma Form" }, { id: "brand-lumen", name: "Lumenry" },
];

export const merchants: Merchant[] = [
  { id: "merchant-one", name: "Demo Supply", trustLabel: "Demo merchant" },
  { id: "merchant-two", name: "Sample Goods", trustLabel: "Demo merchant" },
  { id: "merchant-three", name: "Concept Store", trustLabel: "Demo merchant" },
];

function createDemoProduct(input:{id:string;slug:string;title:string;brandId:string;categoryId:string;summary:string;primaryAdvantage:string;materialOrWeight:string;featured?:boolean;trending?:boolean;rating?:number}):CanonicalProduct{
  return {id:input.id,slug:input.slug,title:input.title,brandId:input.brandId,categoryId:input.categoryId,summary:input.summary,description:`${input.summary} This fictional PostCat listing demonstrates structured product discovery, variants and transparent merchant offers.`,highlights:[input.primaryAdvantage,"Two coordinated demo variants","Catalog-ready product structure"],specifications:{Category:"Demo product",Construction:input.materialOrWeight,Warranty:"Illustrative only",Source:"Local mock catalog"},pros:[input.primaryAdvantage,"Clear comparison fields","Multiple demo offers"],cons:["Fictional product data","No live merchant availability"],featured:input.featured??false,trending:input.trending??true,demoRating:input.rating??4.5,demoReviewCount:48+(input.title.length*3),comparison:{materialOrWeight:input.materialOrWeight,primaryAdvantage:input.primaryAdvantage}};
}

export const products: CanonicalProduct[] = [
  { id:"p-coffee", slug:"aero-brew-coffee-maker", title:"Aero Brew Coffee Maker", brandId:"brand-kanso", categoryId:"cat-coffee-makers", summary:"A compact brewer shaped for deliberate weekday rituals.", description:"A concept countertop brewer with a quiet footprint, simple controls and a reusable filter. All details on this page are demonstration content.", highlights:["Compact 1.1 L footprint","Reusable fine-mesh filter","Simple two-control interface"], specifications:{Capacity:"1.1 L", Material:"Steel + glass", Power:"900 W", Warranty:"Demo information"}, pros:["Small counter footprint","Clear water reservoir","Straightforward controls"], cons:["Mock specifications only","No live stock data"], featured:true, trending:true, demoRating:4.7, demoReviewCount:128, comparison:{materialOrWeight:"Steel + glass",primaryAdvantage:"Small counter footprint"} },
  { id:"p-lamp", slug:"halo-task-lamp", title:"Halo Task Lamp", brandId:"brand-lumen", categoryId:"cat-lighting", summary:"Focused light with a warm, architectural silhouette.", description:"A demonstration lighting concept designed to show how PostCat organizes variants, features and offers.", highlights:["Three demo light modes","Low-glare diffuser","Weighted recycled-aluminum base"], specifications:{Height:"46 cm", Modes:"3 demo modes", Finish:"Powder-coated", Cable:"1.8 m"}, pros:["Directed light","Minimal controls","Compact base"], cons:["Demo performance claims","Indoor concept only"], featured:true, trending:false, demoRating:4.6, demoReviewCount:82, comparison:{materialOrWeight:"Powder-coated aluminum",primaryAdvantage:"Directed low-glare light"} },
  { id:"p-headphones", slug:"arc-one-headphones", title:"Arc One Headphones", brandId:"brand-arc", categoryId:"cat-over-ear-headphones", summary:"Comfort-first wireless audio for long work sessions.", description:"A fictional headphone model used to demonstrate comparison and multi-merchant offer layouts.", highlights:["Soft memory-foam cushions","Fold-flat design","USB-C concept charging"], specifications:{Weight:"245 g", Battery:"Up to 34 h (demo)", Connectivity:"Bluetooth demo", Charging:"USB-C"}, pros:["Comfort-led shape","Simple physical controls","Travel-friendly fold"], cons:["No verified listening tests","Mock battery figure"], featured:true, trending:true, demoRating:4.8, demoReviewCount:214, comparison:{materialOrWeight:"245 g",primaryAdvantage:"Comfort-led shape"} },
  { id:"p-speaker", slug:"pocket-tone-speaker", title:"Pocket Tone Speaker", brandId:"brand-north", categoryId:"cat-bluetooth-speakers", summary:"A small room speaker with a clear, tactile control dial.", description:"A portable speaker concept. Ratings, reviews and performance details are intentionally marked as demo content.", highlights:["Single tactile dial","Splash-resistant concept shell","Pairing indicator"], specifications:{Weight:"420 g", Battery:"Up to 16 h (demo)", Rating:"Concept IPX5", Input:"USB-C"}, pros:["Portable size","Readable controls","Durable visual language"], cons:["Mock water rating","No real audio testing"], featured:false, trending:true, demoRating:4.5, demoReviewCount:96, comparison:{materialOrWeight:"420 g",primaryAdvantage:"Portable tactile controls"} },
  { id:"p-mat", slug:"soma-fold-mat", title:"Soma Fold Mat", brandId:"brand-soma", categoryId:"cat-fitness-yoga", summary:"A foldable movement mat that stores like a slim panel.", description:"A fictional movement mat used for local design demonstration only.", highlights:["Four-panel fold","Textured top surface","Carry loop"], specifications:{Size:"180 × 62 cm", Thickness:"6 mm", Material:"Demo foam blend", Weight:"1.8 kg"}, pros:["Easy to store","Defined fold lines","Carry loop included"], cons:["Material is illustrative","No hands-on testing"], featured:true, trending:true, demoRating:4.7, demoReviewCount:74, comparison:{materialOrWeight:"1.8 kg",primaryAdvantage:"Easy fold-flat storage"} },
  { id:"p-bottle", slug:"field-thermal-bottle", title:"Field Thermal Bottle", brandId:"brand-field", categoryId:"cat-outdoor-hydration", summary:"A clean-lined insulated bottle built for daily carry.", description:"A demonstration outdoor product with mock offers and neutral, non-tested product language.", highlights:["Twist-lock cap","Powder texture concept","Wide cleaning opening"], specifications:{Volume:"680 ml", Material:"Stainless steel", Insulation:"Demo double-wall", Weight:"330 g"}, pros:["Wide opening","Simple cap geometry","Fits common holders"], cons:["Retention not independently tested","Demo colors"], featured:false, trending:true, demoRating:4.4, demoReviewCount:53, comparison:{materialOrWeight:"330 g steel",primaryAdvantage:"Wide cleaning opening"} },
  { id:"p-clock", slug:"still-desk-clock", title:"Still Desk Clock", brandId:"brand-kanso", categoryId:"cat-home-decor", summary:"A low-distraction clock for desks, shelves and bedside tables.", description:"A fictional minimal clock concept for the PostCat discovery interface.", highlights:["No-app interface","Soft contrast display","Rotary alarm control"], specifications:{Width:"14 cm", Display:"Demo e-paper", Power:"USB-C", Alarm:"Single alarm"}, pros:["Low visual noise","Physical control","Compact form"], cons:["Display is conceptual","No verified battery backup"], featured:false, trending:false, demoRating:4.3, demoReviewCount:39, comparison:{materialOrWeight:"14 cm wide",primaryAdvantage:"Low visual noise"} },
  { id:"p-bag", slug:"trail-fold-daypack", title:"Trail Fold Daypack", brandId:"brand-north", categoryId:"cat-backpacks", summary:"A lightweight day bag with a structured, packable shape.", description:"A fictional daypack represented with demo materials and measurements.", highlights:["18 L demo capacity","Pack-flat panel","Two bottle pockets"], specifications:{Capacity:"18 L", Weight:"510 g", Material:"Demo ripstop", Closure:"Roll + clip"}, pros:["Lightweight concept","Useful pocket layout","Packable"], cons:["No load testing","Materials are illustrative"], featured:false, trending:true, demoRating:4.6, demoReviewCount:61, comparison:{materialOrWeight:"510 g ripstop",primaryAdvantage:"Lightweight pocket layout"} },
  createDemoProduct({id:"p-laptop",slug:"northline-air-laptop",title:"Northline Air Laptop",brandId:"brand-north",categoryId:"cat-laptops",summary:"A slim everyday laptop for focused work, study and lightweight creative tasks.",primaryAdvantage:"Portable all-day work profile",materialOrWeight:"1.25 kg aluminum",featured:true,rating:4.8}),
  createDemoProduct({id:"p-monitor",slug:"lumen-view-monitor",title:"Lumen View Monitor",brandId:"brand-lumen",categoryId:"cat-standard-monitors",summary:"A clean 27-inch display concept with a compact stand and calm visual profile.",primaryAdvantage:"Space-efficient 27-inch workspace",materialOrWeight:"4.8 kg composite",rating:4.6}),
  createDemoProduct({id:"p-phone",slug:"arc-pocket-phone",title:"Arc Pocket Phone",brandId:"brand-arc",categoryId:"cat-smartphones",summary:"A balanced smartphone concept built around a bright display and simple controls.",primaryAdvantage:"Comfortable one-hand proportions",materialOrWeight:"178 g glass + alloy",featured:true,rating:4.7}),
  createDemoProduct({id:"p-smart-plug",slug:"lumen-smart-plug",title:"Lumen Smart Plug",brandId:"brand-lumen",categoryId:"cat-smart-plugs-outlets",summary:"A compact connected plug for simple schedules and energy-aware routines.",primaryAdvantage:"Compact dual-outlet footprint",materialOrWeight:"110 g polymer",rating:4.5}),
  createDemoProduct({id:"p-storage",slug:"kanso-modular-storage",title:"Kanso Modular Storage",brandId:"brand-kanso",categoryId:"cat-storage-organization",summary:"Stackable storage modules that keep shelves, closets and worktops visually calm.",primaryAdvantage:"Flexible stack-and-label system",materialOrWeight:"Recycled polymer",rating:4.6}),
  createDemoProduct({id:"p-chair",slug:"soma-curve-chair",title:"Soma Curve Chair",brandId:"brand-soma",categoryId:"cat-furniture",summary:"A compact accent chair concept with a supportive curved back and soft texture.",primaryAdvantage:"Supportive small-space silhouette",materialOrWeight:"Oak + woven fabric",featured:true,rating:4.7}),
  createDemoProduct({id:"p-skincare",slug:"soma-daily-skin-set",title:"Soma Daily Skin Set",brandId:"brand-soma",categoryId:"cat-skincare",summary:"A fictional three-step skincare set presented without medical or outcome claims.",primaryAdvantage:"Simple three-step routine",materialOrWeight:"3 × 50 ml demo set",rating:4.5}),
  createDemoProduct({id:"p-groomer",slug:"arc-precision-groomer",title:"Arc Precision Groomer",brandId:"brand-arc",categoryId:"cat-personal-care",summary:"A rechargeable grooming tool concept with washable attachments and clear controls.",primaryAdvantage:"Interchangeable washable heads",materialOrWeight:"240 g polymer + steel",rating:4.6}),
  createDemoProduct({id:"p-shoes",slug:"northline-everyday-sneakers",title:"Northline Everyday Sneakers",brandId:"brand-north",categoryId:"cat-shoes",summary:"Lightweight casual sneakers with a restrained profile for everyday walking.",primaryAdvantage:"Lightweight flexible sole",materialOrWeight:"620 g pair",featured:true,rating:4.7}),
  createDemoProduct({id:"p-tote",slug:"field-weekend-tote",title:"Field Weekend Tote",brandId:"brand-field",categoryId:"cat-bags-luggage",summary:"A roomy carry-all concept with structured handles and useful internal pockets.",primaryAdvantage:"Wide opening with organized pockets",materialOrWeight:"780 g canvas",rating:4.6}),
  createDemoProduct({id:"p-tent",slug:"northline-two-person-tent",title:"Northline Two-Person Tent",brandId:"brand-north",categoryId:"cat-camping-hiking",summary:"A compact trail shelter concept designed for quick setup and packable storage.",primaryAdvantage:"Fast two-pole setup",materialOrWeight:"2.4 kg demo ripstop",featured:true,rating:4.7}),
  createDemoProduct({id:"p-stroller",slug:"soma-city-stroller",title:"Soma City Stroller",brandId:"brand-soma",categoryId:"cat-baby-gear",summary:"A compact fictional stroller with a one-hand fold and practical storage basket.",primaryAdvantage:"Compact one-hand fold",materialOrWeight:"7.8 kg alloy",rating:4.6}),
  createDemoProduct({id:"p-dog-bed",slug:"field-rest-dog-bed",title:"Field Rest Dog Bed",brandId:"brand-field",categoryId:"cat-dog-supplies",summary:"A washable pet-bed concept with a low entry and supportive padded edge.",primaryAdvantage:"Removable washable cover",materialOrWeight:"Recycled textile fill",rating:4.7}),
  createDemoProduct({id:"p-dashcam",slug:"arc-road-dash-camera",title:"Arc Road Dash Camera",brandId:"brand-arc",categoryId:"cat-car-electronics",summary:"A compact dash-camera concept with a clear mount and distraction-free status display.",primaryAdvantage:"Low-profile windscreen mount",materialOrWeight:"96 g polymer",rating:4.5}),
  createDemoProduct({id:"p-desk",slug:"kanso-sit-stand-desk",title:"Kanso Sit-Stand Desk",brandId:"brand-kanso",categoryId:"cat-office-furniture",summary:"A streamlined adjustable desk concept for focused home and studio workspaces.",primaryAdvantage:"Quiet height-adjustment range",materialOrWeight:"Steel + laminate",featured:true,rating:4.8}),
  createDemoProduct({id:"p-drill",slug:"field-compact-drill",title:"Field Compact Drill",brandId:"brand-field",categoryId:"cat-power-tools",summary:"A cordless drill concept with a balanced grip and straightforward torque control.",primaryAdvantage:"Balanced compact grip",materialOrWeight:"1.35 kg with battery",rating:4.6}),
];

const rawProductFixtures: readonly [string,number,number][] = [
  ["p-coffee",1,12999],["p-lamp",2,18999],["p-headphones",3,24999],["p-speaker",4,7999],["p-mat",5,10999],["p-bottle",6,4499],["p-clock",7,6999],["p-bag",8,8999],
  ["p-laptop",9,89999],["p-monitor",10,24999],["p-phone",11,69999],["p-smart-plug",12,3499],["p-storage",13,5999],["p-chair",14,32999],["p-skincare",15,5499],["p-groomer",16,6999],
  ["p-shoes",17,8499],["p-tote",18,7899],["p-tent",19,21999],["p-stroller",20,34999],["p-dog-bed",21,6499],["p-dashcam",22,11999],["p-desk",23,49999],["p-drill",24,12999],
];
const productFixtures: Record<string,{asset:number;basePrice:number}> = Object.fromEntries(rawProductFixtures.map(([id,asset,basePrice])=>[id,{asset,basePrice}]));
function getProductFixture(productId:string){ const fixture=productFixtures[productId]; if(!fixture)throw new Error(`Missing demo fixture for ${productId}`); return fixture; }

export const variants: ProductVariant[] = products.flatMap((p) => {
  const {asset}=getProductFixture(p.id);
  const first=asset % 2 ? "Stone" : "Ink";
  const second=asset % 2 ? "Ink" : "Clay";
  return [
    { id:`${p.id}-v1`, productId:p.id, label:first, attributes:{Color:first} },
    { id:`${p.id}-v2`, productId:p.id, label:second, attributes:{Color:second} },
  ];
});

export const images: ProductImage[] = products.flatMap((p) => {
  const {asset}=getProductFixture(p.id);
  return [
    { id:`${p.id}-img1`, productId:p.id, src:`/products/product-${asset}.svg`, alt:`${p.title} demo product illustration`, width:800, height:800, role:"hero" },
    { id:`${p.id}-img2`, productId:p.id, src:`/products/product-${asset}-alt.svg`, alt:`${p.title} alternate demo view`, width:800, height:800, role:"gallery" },
  ];
});

export const offers: Offer[] = products.flatMap((p) => [1, 2].flatMap((variantNumber) => {
  const {asset,basePrice}=getProductFixture(p.id);
  const variantId = `${p.id}-v${variantNumber}`;
  const adjustment = variantNumber === 2 ? 500 : 0;
  return [
    { id:`${p.id}-v${variantNumber}-o1`, variantId, merchantId:"merchant-one", price:{amountMinor:basePrice+adjustment,currency:"USD"}, previousPrice:{amountMinor:basePrice+adjustment+2000,currency:"USD"}, availability:"in_stock", shippingLabel:"Demo free delivery", observedAt:"2026-10-24T10:00:00Z" },
    { id:`${p.id}-v${variantNumber}-o2`, variantId, merchantId:"merchant-two", price:{amountMinor:basePrice+adjustment+700,currency:"USD"}, availability:asset % 3 === 1 ? "limited" : "in_stock", shippingLabel:"Demo 2–4 day delivery", observedAt:"2026-10-23T15:00:00Z" },
  ];
}));

const categoryGraph=createCategoryGraph(categories);
export const rootCategories=categories.filter((category)=>category.parentId===undefined);
export function getCategoryBySlug(slug:string){ return categoryGraph.getBySlug(slug); }
export function getCategoryChildren(slug:string){ return categoryGraph.getChildren(slug); }
export function getCategoryDescendants(slug:string){ return categoryGraph.getDescendants(slug); }
export function getCategoryPath(slug:string){ return categoryGraph.getPath(slug); }
function getDescendantCategoryIds(categoryId:string){ return categoryGraph.getDescendantIds(categoryId); }
export function formatMoney(money: Money): string { return new Intl.NumberFormat("en-US", { style:"currency", currency:money.currency }).format(money.amountMinor / 100); }
export function buildProductView(product: CanonicalProduct): ProductView {
  const productVariants=variants.filter(v=>v.productId===product.id);
  const variantIds=new Set(productVariants.map(v=>v.id));
  const productOffers=offers.filter(o=>variantIds.has(o.variantId)).sort((a,b)=>a.price.amountMinor-b.price.amountMinor);
  const availableOffers=productOffers.filter((offer)=>offer.availability==="in_stock"||offer.availability==="limited");
  return { product, brand:brands.find(b=>b.id===product.brandId)!, category:categories.find(c=>c.id===product.categoryId)!, variants:productVariants, images:images.filter(i=>i.productId===product.id), offers:productOffers, merchants, startingPrice:availableOffers[0]?.price, merchantCount:new Set(productOffers.map(o=>o.merchantId)).size };
}
export const productViews=products.map(buildProductView);
export function getProductBySlug(slug:string){ return productViews.find(v=>v.product.slug===slug); }
export function getProductsByCategory(slug:string){ const category=getCategoryBySlug(slug); if(!category)return []; const categoryIds=getDescendantCategoryIds(category.id); return productViews.filter((view)=>categoryIds.has(view.product.categoryId)); }
export function getCategoryProductCount(slug:string){ return getProductsByCategory(slug).length; }
export function isCategoryIndexable(slug:string){ const category=getCategoryBySlug(slug); return Boolean(category && category.status!=="draft" && category.status!=="retired" && getCategoryProductCount(slug)>0); }
export function searchProducts(query:string){
  const tokens=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!tokens.length) return productViews;
  return productViews.filter((view)=>{
    const taxonomy=getCategoryPath(view.category.slug).flatMap((category)=>[category.name,...category.searchTerms]).join(" ");
    const haystack=`${view.product.title} ${view.product.summary} ${view.product.description} ${view.product.highlights.join(" ")} ${view.product.pros.join(" ")} ${Object.values(view.product.specifications).join(" ")} ${view.product.comparison.primaryAdvantage} ${view.brand.name} ${taxonomy}`.toLowerCase();
    return tokens.every((token)=>haystack.includes(token));
  });
}
export interface CatalogFilterOptions { query?:string; category?:string; maxPriceMinor?:number; inStockOnly?:boolean; sort?:"relevance"|"price-asc"|"price-desc"|"rating-desc" }
export function filterProducts(options:CatalogFilterOptions={}){
  const {query="",category,maxPriceMinor,inStockOnly=false,sort="relevance"}=options;
  let items=query ? searchProducts(query) : [...productViews];
  if(category){ const allowed=new Set(getProductsByCategory(category).map((item)=>item.product.id)); items=items.filter((item)=>allowed.has(item.product.id)); }
  if(maxPriceMinor!==undefined) items=items.filter((item)=>(item.startingPrice?.amountMinor??Infinity)<=maxPriceMinor);
  if(inStockOnly) items=items.filter((item)=>item.offers.some((offer)=>offer.availability==="in_stock"||offer.availability==="limited"));
  if(sort==="price-asc") items.sort((a,b)=>(a.startingPrice?.amountMinor??Infinity)-(b.startingPrice?.amountMinor??Infinity));
  if(sort==="price-desc") items.sort((a,b)=>(b.startingPrice?.amountMinor??-Infinity)-(a.startingPrice?.amountMinor??-Infinity));
  if(sort==="rating-desc") items.sort((a,b)=>b.product.demoRating-a.product.demoRating);
  return items;
}
export function getFeaturedProducts(){ return productViews.filter(v=>v.product.featured); }
export function getTrendingProducts(){ return productViews.filter(v=>v.product.trending); }

export function getOffersForVariant(variantId:string){ return offers.filter((offer)=>offer.variantId===variantId).sort((a,b)=>a.price.amountMinor-b.price.amountMinor); }
export function getComparisonValue(item:ProductView, key:"materialOrWeight"|"primaryAdvantage"){ return item.product.comparison[key]; }
