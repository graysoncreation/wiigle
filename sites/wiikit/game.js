var PACKS = [
  { name: "Space Pack", items: {
    Uncommon: ["Earth", "Meteor", "Stars", "Alien"],
    Rare: ["Planet", "UFO"], Epic: ["Spaceship"], Legendary: ["Astronaut"],
    Chroma: ["Pink Astronaut", "Yellow Astronaut", "Black Astronaut", "Orange Astronaut", "Red Astronaut", "Brown Astronaut", "Green Astronaut"]
  }},
  { name: "Medieval Pack", items: {
    Uncommon: ["Witch", "Wizard", "Elf", "Fairy", "Slime Monster"],
    Rare: ["Jester", "Dragon", "Queen"], Epic: ["Unicorn"], Legendary: ["King"]
  }},
  { name: "Aquatic Pack", items: {
    Uncommon: ["Old Boot", "Jellyfish", "Clownfish", "Frog", "Crab"],
    Rare: ["Pufferfish", "Blobfish", "Octopus"], Epic: ["Narwhal", "Dolphin"],
    Legendary: ["Baby Shark", "Megalodon"]
  }},
  { name: "Breakfast Pack", items: {
    Uncommon: ["Toast", "Cereal", "Yogurt", "Breakfast Combo", "Orange Juice", "Milk"],
    Rare: ["Waffle", "Pancakes"], Epic: ["French Toast", "Pizza"]
  }},
  { name: "Bot Pack", items: {
    Uncommon: ["Lil Bot", "Lovely Bot", "Angry Bot", "Happy Bot"],
    Rare: ["Watson", "Buddy Bot"], Epic: ["Brainy Bot"], Legendary: ["Mega Bot"]
  }},
  { name: "Safari Pack", items: {
    Uncommon: ["Panda", "Sloth", "Tenrec", "Flamingo", "Zebra"],
    Rare: ["Elephant", "Lemur", "Peacock"], Epic: ["Chameleon"],
    Legendary: ["Lion"], Chroma: ["Rainbow Panda"]
  }},
  { name: "Dino Pack", items: {
    Uncommon: ["Amber", "Dino Egg", "Dino Fossil", "Stegosaurus"],
    Rare: ["Velociraptor", "Brontosaurus"], Epic: ["Triceratops"],
    Legendary: ["Tyrannosaurus Rex"]
  }},
  { name: "Bug Pack", items: {
    Uncommon: ["Ant", "Rhino Beetle", "Ladybug", "Fly"],
    Rare: ["Worm", "Bee"], Epic: ["Mantis"], Legendary: ["Butterfly"],
    Chroma: ["Blue Butterfly"]
  }},
  { name: "Lunch Pack", items: {
    Uncommon: ["Bananas", "Watermelon", "Cheese", "Doughnut"],
    Rare: ["Taco", "Bao", "Sushi"], Epic: ["Cheeseburger"],
    Legendary: ["Sandwich"], Chroma: ["Half a Sandwich"]
  }},
  { name: "Pirate Pack", items: {
    Uncommon: ["Deckhand", "Buccaneer", "Swashbuckler", "Treasure Map", "Seagull"],
    Rare: ["Jolly Pirate", "Pirate Ship"], Epic: ["Kraken"],
    Legendary: ["Captain Blackbeard"], Chroma: ["Pirate Pufferfish"]
  }},
  { name: "Outback Pack", items: {
    Uncommon: ["Dingo", "Echidna", "Koala", "Kookaburra"],
    Rare: ["Platypus", "Joey", "Kangaroo"], Epic: ["Crocodile"],
    Legendary: ["Sugar Glider"], Chroma: ["Teal Platypus"]
  }},
  { name: "Ice Monster Pack", items: {
    Uncommon: ["Ice Bat", "Ice Bug", "Ice Elemental", "Rock Monster"],
    Rare: ["Dink", "Donk"], Epic: ["Bush Monster"], Legendary: ["Yeti"],
    Chroma: ["Ice Slime", "Frozen Fossil", "Ice Crab"]
  }},
  { name: "Wonderland Pack", items: {
    Uncommon: ["Two of Spades", "Eat Me", "Drink Me", "Alice", "Queen of Hearts"],
    Rare: ["Dormouse", "White Rabbit", "Cheshire Cat"],
    Epic: ["Caterpillar", "Mad Hatter"], Legendary: ["King of Hearts"]
  }}
];

var RARITIES = ["Uncommon", "Rare", "Epic", "Legendary", "Chroma"];
var WEIGHTS = { Uncommon: 60, Rare: 25, Epic: 10, Legendary: 4, Chroma: 1 };
var collection = {};
var opened = 0;

function byId(id) {
  return document.getElementById(id);
}

function escapeText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function loadSave() {
  try {
    var raw = window.localStorage ? window.localStorage.getItem("wiikit-save") : null;
    if (raw) {
      var save = JSON.parse(raw);
      collection = save.collection || {};
      opened = save.opened || 0;
    }
  } catch (e) {
    collection = {};
    opened = 0;
  }
}

function saveGame() {
  try {
    if (window.localStorage) {
      window.localStorage.setItem("wiikit-save", JSON.stringify({
        collection: collection,
        opened: opened
      }));
    }
  } catch (e) {}
}

function startWiiKit() {
  loadSave();
  var packSelect = byId("pack-select");
  var filter = byId("collection-filter");
  var i;
  filter.options[0] = new Option("All Packs", "all");
  for (i = 0; i < PACKS.length; i++) {
    packSelect.options[i] = new Option(PACKS[i].name, String(i));
    filter.options[i + 1] = new Option(PACKS[i].name, String(i));
  }
  byId("total-count").innerHTML = String(totalBlooks());
  showPackInfo();
  drawCollection();
}

function totalBlooks() {
  var total = 0;
  var p, r;
  for (p = 0; p < PACKS.length; p++) {
    for (r = 0; r < RARITIES.length; r++) {
      if (PACKS[p].items[RARITIES[r]]) {
        total += PACKS[p].items[RARITIES[r]].length;
      }
    }
  }
  return total;
}

function showPackInfo() {
  var pack = PACKS[parseInt(byId("pack-select").value || "0", 10)];
  var parts = [];
  var i;
  for (i = 0; i < RARITIES.length; i++) {
    if (pack.items[RARITIES[i]]) {
      parts.push(RARITIES[i] + ": " + pack.items[RARITIES[i]].length);
    }
  }
  byId("pack-info").innerHTML = escapeText(pack.name) + " &mdash; " + parts.join(" &bull; ");
}

function chooseRarity(pack) {
  var total = 0;
  var i;
  for (i = 0; i < RARITIES.length; i++) {
    if (pack.items[RARITIES[i]]) total += WEIGHTS[RARITIES[i]];
  }
  var roll = Math.random() * total;
  for (i = 0; i < RARITIES.length; i++) {
    if (pack.items[RARITIES[i]]) {
      roll -= WEIGHTS[RARITIES[i]];
      if (roll < 0) return RARITIES[i];
    }
  }
  return "Uncommon";
}

function openPack() {
  var packIndex = parseInt(byId("pack-select").value || "0", 10);
  var pack = PACKS[packIndex];
  var result = byId("result");
  result.className = "opening";
  result.style.borderColor = "#9aa9b2";
  byId("rarity").className = "";
  byId("rarity").innerHTML = "Opening " + escapeText(pack.name) + "...";
  byId("blook-name").innerHTML = "?";
  byId("new-label").innerHTML = "";

  window.setTimeout(function() {
    var rarity = chooseRarity(pack);
    var choices = pack.items[rarity];
    var name = choices[Math.floor(Math.random() * choices.length)];
    var key = packIndex + "|" + rarity + "|" + name;
    var isNew = !collection[key];
    collection[key] = (collection[key] || 0) + 1;
    opened++;

    result.style.borderColor = rarityColor(rarity);
    byId("rarity").className = rarity;
    byId("rarity").innerHTML = rarity;
    byId("blook-name").innerHTML = escapeText(name);
    byId("new-label").innerHTML = isNew ? "NEW BLOOK!" : "Duplicate &times;" + collection[key];
    saveGame();
    drawCollection();
  }, 650);
}

function rarityColor(rarity) {
  var colors = {
    Uncommon: "#2c9b42", Rare: "#287fc0", Epic: "#8847c9",
    Legendary: "#e58b00", Chroma: "#e13f92"
  };
  return colors[rarity] || "#9aa9b2";
}

function drawCollection() {
  var selected = byId("collection-filter").value || "all";
  var html = "";
  var unique = 0;
  var p, r, i, key, count;
  for (p = 0; p < PACKS.length; p++) {
    if (selected !== "all" && selected !== String(p)) continue;
    for (r = 0; r < RARITIES.length; r++) {
      var list = PACKS[p].items[RARITIES[r]];
      if (!list) continue;
      for (i = 0; i < list.length; i++) {
        key = p + "|" + RARITIES[r] + "|" + list[i];
        count = collection[key] || 0;
        if (count) {
          html += '<div class="collection-row"><span class="count">x' + count +
            '</span><strong>' + escapeText(list[i]) + '</strong> ' +
            '<span class="' + RARITIES[r] + '">(' + RARITIES[r] + ')</span>' +
            '<br><small>' + escapeText(PACKS[p].name) + '</small></div>';
        }
      }
    }
  }
  for (key in collection) {
    if (collection.hasOwnProperty(key) && collection[key] > 0) unique++;
  }
  byId("opened-count").innerHTML = String(opened);
  byId("unique-count").innerHTML = String(unique);
  byId("collection").innerHTML = html || '<p class="empty">No blooks from this selection yet.</p>';
}

function clearCollection() {
  if (window.confirm("Clear every blook and reset your pack count?")) {
    collection = {};
    opened = 0;
    saveGame();
    byId("result").style.display = "none";
    drawCollection();
  }
}

startWiiKit();