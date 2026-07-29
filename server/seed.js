import bcrypt from 'bcryptjs';
import { initDb, query } from './db.js';

async function seed() {
  console.log('Starting database seeding...');
  
  // 1. Initialize DB tables
  await initDb();

  // 2. Insert admin user
  const adminUsername = 'admin';
  const plainPassword = 'albionadmin123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  try {
    await query.run(
      'INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)',
      [adminUsername, passwordHash]
    );
    console.log(`User '${adminUsername}' created successfully (or already exists).`);
  } catch (err) {
    console.error('Error inserting admin user:', err.message);
  }

  // 3. Insert City Constants
  const cities = [
    {
      city: 'Martlock',
      refining_bonus: 'LEATHER',
      crafting_bonuses: JSON.stringify(['AXE', 'QUARTERSTAFF', 'FROST_STAFF', 'PLATE_SHOES', 'LEATHER_JACKET'])
    },
    {
      city: 'Thetford',
      refining_bonus: 'METALBAR',
      crafting_bonuses: JSON.stringify(['MACE', 'NATURE_STAFF', 'FIRE_STAFF', 'LEATHER_ARMOR', 'CLOTH_HELMET'])
    },
    {
      city: 'Fort Sterling',
      refining_bonus: 'PLANK',
      crafting_bonuses: JSON.stringify(['HAMMER', 'SPEAR', 'HOLY_STAFF', 'PLATE_HELMET', 'CLOTH_SHOES'])
    },
    {
      city: 'Lymhurst',
      refining_bonus: 'CLOTH',
      crafting_bonuses: JSON.stringify(['SWORD', 'BOW', 'ARCANE_STAFF', 'LEATHER_SHOES', 'CLOTH_COWL'])
    },
    {
      city: 'Bridgewatch',
      refining_bonus: 'STONEBLOCK',
      crafting_bonuses: JSON.stringify(['DAGGER', 'CURSE_STAFF', 'WAR_GLOVE', 'PLATE_ARMOR', 'CLOTH_ROBE'])
    },
    {
      city: 'Caerleon',
      refining_bonus: null,
      crafting_bonuses: JSON.stringify(['TOOL', 'FOOD', 'POTION'])
    }
  ];

  for (const city of cities) {
    try {
      await query.run(
        `INSERT OR REPLACE INTO city_constants (city, refining_bonus, crafting_bonuses) 
         VALUES (?, ?, ?)`,
        [city.city, city.refining_bonus, city.crafting_bonuses]
      );
    } catch (err) {
      console.error(`Error inserting city ${city.city}:`, err.message);
    }
  }
  console.log('City constants seeded.');

  // 4. Generate & Insert Items
  const itemsToInsert = [];

  // Resource Types definition
  const rawResources = [
    { type: 'HIDE', name_pt: 'Couro Bruto', name_en: 'Raw Hide' },
    { type: 'ORE', name_pt: 'Minério', name_en: 'Ore' },
    { type: 'WOOD', name_pt: 'Madeira', name_en: 'Wood' },
    { type: 'FIBER', name_pt: 'Fibra', name_en: 'Fiber' },
    { type: 'STONE', name_pt: 'Pedra', name_en: 'Stone' }
  ];

  const refinedResources = [
    { type: 'LEATHER', name_pt: 'Couro', name_en: 'Leather' },
    { type: 'METALBAR', name_pt: 'Barra de Metal', name_en: 'Metal Bar' },
    { type: 'PLANK', name_pt: 'Tábua', name_en: 'Plank' },
    { type: 'CLOTH', name_pt: 'Tecido', name_en: 'Cloth' },
    { type: 'STONEBLOCK', name_pt: 'Bloco de Pedra', name_en: 'Stone Block' }
  ];

  // Base weights for resources (T4 - T8)
  const resourceWeights = {
    3: 0.1,
    4: 0.2,
    5: 0.3,
    6: 0.5,
    7: 0.8,
    8: 1.2
  };

  // Seed standard T3 refined resources (needed as inputs for T4 refining)
  refinedResources.forEach(res => {
    const id = `T3_${res.type}`;
    itemsToInsert.push({
      id,
      name_pt: `${res.name_pt} T3`,
      name_en: `${res.name_en} T3`,
      tier: 3,
      enchantment: 0,
      item_type: 'refined_resource',
      weight: resourceWeights[3]
    });
  });

  // Seed T4 to T8 resources
  for (let tier = 4; tier <= 8; tier++) {
    // Raw resources
    rawResources.forEach(res => {
      // Stone does not have enchantments in Albion
      const maxEnch = res.type === 'STONE' ? 0 : 4;
      
      for (let ench = 0; ench <= maxEnch; ench++) {
        const id = ench === 0 ? `T${tier}_${res.type}` : `T${tier}_${res.type}_LEVEL${ench}`;
        const suffix = ench === 0 ? '' : `.${ench}`;
        itemsToInsert.push({
          id,
          name_pt: `${res.name_pt} T${tier}${suffix}`,
          name_en: `${res.name_en} T${tier}${suffix}`,
          tier,
          enchantment: ench,
          item_type: 'raw_resource',
          weight: resourceWeights[tier] * (1 + ench * 0.1)
        });
      }
    });

    // Refined resources
    refinedResources.forEach(res => {
      const maxEnch = res.type === 'STONEBLOCK' ? 0 : 4;
      
      for (let ench = 0; ench <= maxEnch; ench++) {
        const id = ench === 0 ? `T${tier}_${res.type}` : `T${tier}_${res.type}_LEVEL${ench}`;
        const suffix = ench === 0 ? '' : `.${ench}`;
        itemsToInsert.push({
          id,
          name_pt: `${res.name_pt} T${tier}${suffix}`,
          name_en: `${res.name_en} T${tier}${suffix}`,
          tier,
          enchantment: ench,
          item_type: 'refined_resource',
          weight: resourceWeights[tier] * (1 + ench * 0.1)
        });
      }
    });
  }

  // Seed Herbs, Crops, farm animal products, potions and foods
  const herbsList = [
    { id: 'T2_AGARIC', name_pt: 'Agárico Arcano T2', name_en: 'Arcane Agaric T2', tier: 2 },
    { id: 'T3_COMFREY', name_pt: 'Confrei de Folha-Brilhante T3', name_en: 'Brightleaf Comfrey T3', tier: 3 },
    { id: 'T4_BURDOCK', name_pt: 'Bardana Alveada T4', name_en: 'Crenellated Burdock T4', tier: 4 },
    { id: 'T5_TEASEL', name_pt: 'Cardo-Penteador do Dragão T5', name_en: 'Dragon Teasel T5', tier: 5 },
    { id: 'T6_FOXGLOVE', name_pt: 'Dedaleira Ardilosa T6', name_en: 'Elusive Foxglove T6', tier: 6 },
    { id: 'T7_MULLEIN', name_pt: 'Verbasco T7', name_en: 'Firetouched Mullein T7', tier: 7 },
    { id: 'T8_YARROW', name_pt: 'Milefólio T8', name_en: 'Ghoul Yarrow T8', tier: 8 }
  ];

  const cropsList = [
    { id: 'T1_CARROT', name_pt: 'Cenoura T1', name_en: 'Carrot T1', tier: 1 },
    { id: 'T3_WHEAT', name_pt: 'Trigo T3', name_en: 'Wheat T3', tier: 3 },
    { id: 'T4_TURNIP', name_pt: 'Nabo T4', name_en: 'Turnip T4', tier: 4 },
    { id: 'T5_CABBAGE', name_pt: 'Repolho T5', name_en: 'Cabbage T5', tier: 5 },
    { id: 'T6_POTATO', name_pt: 'Batata T6', name_en: 'Potato T6', tier: 6 },
    { id: 'T7_CORN', name_pt: 'Milho T7', name_en: 'Corn T7', tier: 7 },
    { id: 'T8_PUMPKIN', name_pt: 'Abóbora T8', name_en: 'Pumpkin T8', tier: 8 }
  ];

  const farmAnimalProducts = [
    { id: 'T3_EGG', name_pt: 'Ovo de Galinha T3', name_en: 'Hen Egg T3', tier: 3 },
    { id: 'T5_EGG', name_pt: 'Ovo de Ganso T5', name_en: 'Goose Egg T5', tier: 5 },
    { id: 'T3_MEAT', name_pt: 'Carne de Galinha T3', name_en: 'Raw Chicken T3', tier: 3 },
    { id: 'T4_MILK', name_pt: 'Leite de Cabra T4', name_en: 'Goat Milk T4', tier: 4 },
    { id: 'T6_MILK', name_pt: 'Leite de Ovelha T6', name_en: 'Sheep Milk T6', tier: 6 },
    { id: 'T8_MILK', name_pt: 'Leite de Vaca T8', name_en: 'Cow Milk T8', tier: 8 },
    { id: 'T4_MEAT', name_pt: 'Carne de Cabra T4', name_en: 'Raw Goat T4', tier: 4 },
    { id: 'T5_MEAT', name_pt: 'Carne de Ganso T5', name_en: 'Raw Goose T5', tier: 5 },
    { id: 'T6_MEAT', name_pt: 'Carne de Carneiro T6', name_en: 'Raw Mutton T6', tier: 6 },
    { id: 'T7_MEAT', name_pt: 'Carne de Porco T7', name_en: 'Raw Pork T7', tier: 7 },
    { id: 'T8_MEAT', name_pt: 'Carne de Boi T8', name_en: 'Raw Beef T8', tier: 8 },
    // Butter
    { id: 'T4_BUTTER', name_pt: 'Manteiga de Cabra T4', name_en: 'Goat Butter T4', tier: 4 },
    { id: 'T6_BUTTER', name_pt: 'Manteiga de Ovelha T6', name_en: 'Sheep Butter T6', tier: 6 },
    { id: 'T8_BUTTER', name_pt: 'Manteiga de Vaca T8', name_en: 'Cow Butter T8', tier: 8 },
    // Alcohols
    { id: 'T4_ALCOHOL', name_pt: 'Cerveja de Trigo T4', name_en: 'Wheat Beer T4', tier: 4 },
    { id: 'T6_ALCOHOL', name_pt: 'Aguardente de Batata T6', name_en: 'Potato Schnapps T6', tier: 6 },
    { id: 'T7_ALCOHOL', name_pt: 'Cachaça de Milho T7', name_en: 'Corn Hooch T7', tier: 7 },
    { id: 'T8_ALCOHOL', name_pt: 'Uísque de Abóbora T8', name_en: 'Pumpkin Moonshine T8', tier: 8 },
    // Bread
    { id: 'T4_BREAD', name_pt: 'Pão T4', name_en: 'Bread T4', tier: 4 }
  ];

  const potionsList = [
    { id: 'T4_POTION_HEAL', name_pt: 'Poção de Cura T4', name_en: 'Healing Potion T4', tier: 4 },
    { id: 'T6_POTION_HEAL', name_pt: 'Poção de Cura T6', name_en: 'Healing Potion T6', tier: 6 },
    { id: 'T4_POTION_COOLDOWN', name_pt: 'Poção de Veneno T4', name_en: 'Poison Potion T4', tier: 4 },
    { id: 'T6_POTION_COOLDOWN', name_pt: 'Poção de Veneno T6', name_en: 'Poison Potion T6', tier: 6 },
    { id: 'T8_POTION_COOLDOWN', name_pt: 'Poção de Veneno T8', name_en: 'Poison Potion T8', tier: 8 },
    { id: 'T3_POTION_STONESKIN', name_pt: 'Poção de Resistência T3', name_en: 'Resistance Potion T3', tier: 3 },
    { id: 'T5_POTION_STONESKIN', name_pt: 'Poção de Resistência T5', name_en: 'Resistance Potion T5', tier: 5 },
    { id: 'T7_POTION_STONESKIN', name_pt: 'Poção de Resistência T7', name_en: 'Resistance Potion T7', tier: 7 },
    { id: 'T3_POTION_GROWTH', name_pt: 'Poção de Gigante T3', name_en: 'Gigantify Potion T3', tier: 3 },
    { id: 'T5_POTION_GROWTH', name_pt: 'Poção de Gigante T5', name_en: 'Gigantify Potion T5', tier: 5 },
    { id: 'T7_POTION_GROWTH', name_pt: 'Poção de Gigante T7', name_en: 'Gigantify Potion T7', tier: 7 }
  ];

  const foodsList = [
    { id: 'T4_MEAL_STEW', name_pt: 'Ensopado de Cabra T4', name_en: 'Goat Stew T4', tier: 4 },
    { id: 'T6_MEAL_STEW', name_pt: 'Ensopado de Carneiro T6', name_en: 'Mutton Stew T6', tier: 6 },
    { id: 'T8_MEAL_STEW', name_pt: 'Ensopado de Boi T8', name_en: 'Beef Stew T8', tier: 8 },
    { id: 'T4_MEAL_SANDWICH', name_pt: 'Sanduíche de Cabra T4', name_en: 'Goat Sandwich T4', tier: 4 },
    { id: 'T6_MEAL_SANDWICH', name_pt: 'Sanduíche de Carneiro T6', name_en: 'Mutton Sandwich T6', tier: 6 },
    { id: 'T8_MEAL_SANDWICH', name_pt: 'Sanduíche de Boi T8', name_en: 'Beef Sandwich T8', tier: 8 },
    { id: 'T3_MEAL_OMELETTE', name_pt: 'Omelete de Galinha T3', name_en: 'Chicken Omelette T3', tier: 3 },
    { id: 'T5_MEAL_OMELETTE', name_pt: 'Omelete de Ganso T5', name_en: 'Goose Omelette T5', tier: 5 },
    { id: 'T7_MEAL_OMELETTE', name_pt: 'Omelete de Porco T7', name_en: 'Pork Omelette T7', tier: 7 }
  ];

  herbsList.forEach(item => {
    itemsToInsert.push({
      id: item.id,
      name_pt: item.name_pt,
      name_en: item.name_en,
      tier: item.tier,
      enchantment: 0,
      item_type: 'raw_resource',
      weight: 0.1
    });
  });

  cropsList.forEach(item => {
    itemsToInsert.push({
      id: item.id,
      name_pt: item.name_pt,
      name_en: item.name_en,
      tier: item.tier,
      enchantment: 0,
      item_type: 'raw_resource',
      weight: 0.1
    });
  });

  farmAnimalProducts.forEach(item => {
    itemsToInsert.push({
      id: item.id,
      name_pt: item.name_pt,
      name_en: item.name_en,
      tier: item.tier,
      enchantment: 0,
      item_type: 'raw_resource',
      weight: 0.1
    });
  });

  potionsList.forEach(item => {
    itemsToInsert.push({
      id: item.id,
      name_pt: item.name_pt,
      name_en: item.name_en,
      tier: item.tier,
      enchantment: 0,
      item_type: 'consumable',
      weight: 0.1
    });
  });

  foodsList.forEach(item => {
    itemsToInsert.push({
      id: item.id,
      name_pt: item.name_pt,
      name_en: item.name_en,
      tier: item.tier,
      enchantment: 0,
      item_type: 'consumable',
      weight: 0.1
    });
  });

  // Equipment Types definition
  const equipment = [
    { baseId: 'MAIN_AXE', name_pt: 'Machado de Batalha', name_en: 'Battleaxe', type: 'weapon', bonusGroup: 'AXE', weight: 4.3 },
    { baseId: '2H_AXE', name_pt: 'Grande Machado', name_en: 'Greataxe', type: 'weapon', bonusGroup: 'AXE', weight: 5.8 },
    { baseId: 'MAIN_SWORD', name_pt: 'Espada Larga', name_en: 'Broadsword', type: 'weapon', bonusGroup: 'SWORD', weight: 4.1 },
    { baseId: '2H_DUALSWORD', name_pt: 'Espadas Duplas', name_en: 'Dual Swords', type: 'weapon', bonusGroup: 'SWORD', weight: 5.5 },
    { baseId: 'MAIN_BOW', name_pt: 'Arco', name_en: 'Bow', type: 'weapon', bonusGroup: 'BOW', weight: 3.8 },
    { baseId: '2H_WARBOW', name_pt: 'Arco de Guerra', name_en: 'Warbow', type: 'weapon', bonusGroup: 'BOW', weight: 4.2 },
    { baseId: 'MAIN_DAGGER', name_pt: 'Adaga', name_en: 'Dagger', type: 'weapon', bonusGroup: 'DAGGER', weight: 2.8 },
    { baseId: 'MAIN_SPEAR', name_pt: 'Lança', name_en: 'Spear', type: 'weapon', bonusGroup: 'SPEAR', weight: 4.0 },
    { baseId: 'MAIN_MACE', name_pt: 'Maça', name_en: 'Mace', type: 'weapon', bonusGroup: 'MACE', weight: 4.8 },
    { baseId: 'MAIN_HAMMER', name_pt: 'Martelo', name_en: 'Hammer', type: 'weapon', bonusGroup: 'HAMMER', weight: 5.2 },
    
    // Magic Staffs
    { baseId: 'MAIN_FIRESTAFF', name_pt: 'Cajado de Fogo', name_en: 'Fire Staff', type: 'weapon', bonusGroup: 'FIRE_STAFF', weight: 4.0 },
    { baseId: 'MAIN_FROSTSTAFF', name_pt: 'Cajado de Gelo', name_en: 'Frost Staff', type: 'weapon', bonusGroup: 'FROST_STAFF', weight: 4.0 },
    { baseId: 'MAIN_HOLYSTAFF', name_pt: 'Cajado Sagrado', name_en: 'Holy Staff', type: 'weapon', bonusGroup: 'HOLY_STAFF', weight: 4.0 },
    { baseId: 'MAIN_NATURESTAFF', name_pt: 'Cajado da Natureza', name_en: 'Nature Staff', type: 'weapon', bonusGroup: 'NATURE_STAFF', weight: 4.0 },
    { baseId: 'MAIN_ARCANESTAFF', name_pt: 'Cajado Arcano', name_en: 'Arcane Staff', type: 'weapon', bonusGroup: 'ARCANE_STAFF', weight: 4.0 },
    { baseId: 'MAIN_CURSESTAFF', name_pt: 'Cajado Amaldiçoado', name_en: 'Cursed Staff', type: 'weapon', bonusGroup: 'CURSE_STAFF', weight: 4.0 },

    // Crossbows, Quarterstaffs, War Gloves
    { baseId: 'MAIN_CROSSBOW', name_pt: 'Besta', name_en: 'Crossbow', type: 'weapon', bonusGroup: 'CROSSBOW', weight: 5.0 },
    { baseId: '2H_QUARTERSTAFF', name_pt: 'Cajado Bilaminado', name_en: 'Quarterstaff', type: 'weapon', bonusGroup: 'QUARTERSTAFF', weight: 4.5 },
    { baseId: '2H_WARGLOVE', name_pt: 'Luvas de Guerra', name_en: 'War Gloves', type: 'weapon', bonusGroup: 'WAR_GLOVE', weight: 3.5 },

    // Offhands
    { baseId: 'OFF_SHIELD', name_pt: 'Escudo', name_en: 'Shield', type: 'offhand', bonusGroup: 'SHIELD', weight: 2.5 },
    { baseId: 'OFF_TORCH', name_pt: 'Tocha', name_en: 'Torch', type: 'offhand', bonusGroup: 'TORCH', weight: 1.5 },
    { baseId: 'OFF_TOWERTOME', name_pt: 'Livro de Feitiços', name_en: 'Tome of Spells', type: 'offhand', bonusGroup: 'TOME', weight: 1.0 },

    // Armors
    { baseId: 'ARMOR_PLATE_SET1', name_pt: 'Armadura do Soldado', name_en: 'Soldier Armor', type: 'armor', bonusGroup: 'PLATE_ARMOR', weight: 6.5 },
    { baseId: 'ARMOR_PLATE_SET2', name_pt: 'Armadura do Cavaleiro', name_en: 'Knight Armor', type: 'armor', bonusGroup: 'PLATE_ARMOR', weight: 6.5 },
    { baseId: 'ARMOR_PLATE_SET3', name_pt: 'Armadura do Guardião', name_en: 'Guardian Armor', type: 'armor', bonusGroup: 'PLATE_ARMOR', weight: 6.5 },

    { baseId: 'ARMOR_LEATHER_SET1', name_pt: 'Casaco do Mercenário', name_en: 'Mercenary Jacket', type: 'armor', bonusGroup: 'LEATHER_JACKET', weight: 4.5 },
    { baseId: 'ARMOR_LEATHER_SET2', name_pt: 'Casaco do Caçador', name_en: 'Hunter Jacket', type: 'armor', bonusGroup: 'LEATHER_JACKET', weight: 4.5 },
    { baseId: 'ARMOR_LEATHER_SET3', name_pt: 'Casaco do Assassino', name_en: 'Assassin Jacket', type: 'armor', bonusGroup: 'LEATHER_JACKET', weight: 4.5 },

    { baseId: 'ARMOR_CLOTH_SET1', name_pt: 'Robe do Mago', name_en: 'Mage Robe', type: 'armor', bonusGroup: 'CLOTH_ROBE', weight: 3.2 },
    { baseId: 'ARMOR_CLOTH_SET2', name_pt: 'Robe do Erudito', name_en: 'Scholar Robe', type: 'armor', bonusGroup: 'CLOTH_ROBE', weight: 3.2 },
    { baseId: 'ARMOR_CLOTH_SET3', name_pt: 'Robe do Clérigo', name_en: 'Cleric Robe', type: 'armor', bonusGroup: 'CLOTH_ROBE', weight: 3.2 },

    // Helmets
    { baseId: 'HELMET_PLATE_SET1', name_pt: 'Elmo do Soldado', name_en: 'Soldier Helmet', type: 'helmet', bonusGroup: 'PLATE_HELMET', weight: 1.2 },
    { baseId: 'HELMET_PLATE_SET2', name_pt: 'Elmo do Cavaleiro', name_en: 'Knight Helmet', type: 'helmet', bonusGroup: 'PLATE_HELMET', weight: 1.2 },
    { baseId: 'HELMET_PLATE_SET3', name_pt: 'Elmo do Guardião', name_en: 'Guardian Helmet', type: 'helmet', bonusGroup: 'PLATE_HELMET', weight: 1.2 },

    { baseId: 'HELMET_LEATHER_SET1', name_pt: 'Capuz do Mercenário', name_en: 'Mercenary Hood', type: 'helmet', bonusGroup: 'LEATHER_HELMET', weight: 1.0 },
    { baseId: 'HELMET_LEATHER_SET2', name_pt: 'Capuz do Caçador', name_en: 'Hunter Hood', type: 'helmet', bonusGroup: 'LEATHER_HELMET', weight: 1.0 },
    { baseId: 'HELMET_LEATHER_SET3', name_pt: 'Capuz do Assassino', name_en: 'Assassin Hood', type: 'helmet', bonusGroup: 'LEATHER_HELMET', weight: 1.0 },

    { baseId: 'HELMET_CLOTH_SET1', name_pt: 'Hábito do Mago', name_en: 'Mage Cowl', type: 'helmet', bonusGroup: 'CLOTH_HELMET', weight: 1.0 },
    { baseId: 'HELMET_CLOTH_SET2', name_pt: 'Hábito do Erudito', name_en: 'Scholar Cowl', type: 'helmet', bonusGroup: 'CLOTH_HELMET', weight: 1.0 },
    { baseId: 'HELMET_CLOTH_SET3', name_pt: 'Hábito do Clérigo', name_en: 'Cleric Cowl', type: 'helmet', bonusGroup: 'CLOTH_HELMET', weight: 1.0 },
    
    // Shoes
    { baseId: 'SHOES_PLATE_SET1', name_pt: 'Botas do Soldado', name_en: 'Soldier Boots', type: 'shoes', bonusGroup: 'PLATE_SHOES', weight: 1.5 },
    { baseId: 'SHOES_PLATE_SET2', name_pt: 'Botas do Cavaleiro', name_en: 'Knight Boots', type: 'shoes', bonusGroup: 'PLATE_SHOES', weight: 1.5 },
    { baseId: 'SHOES_PLATE_SET3', name_pt: 'Botas do Guardião', name_en: 'Guardian Boots', type: 'shoes', bonusGroup: 'PLATE_SHOES', weight: 1.5 },

    { baseId: 'SHOES_LEATHER_SET1', name_pt: 'Sapatos do Mercenário', name_en: 'Mercenary Shoes', type: 'shoes', bonusGroup: 'LEATHER_SHOES', weight: 1.3 },
    { baseId: 'SHOES_LEATHER_SET2', name_pt: 'Sapatos do Caçador', name_en: 'Hunter Shoes', type: 'shoes', bonusGroup: 'LEATHER_SHOES', weight: 1.3 },
    { baseId: 'SHOES_LEATHER_SET3', name_pt: 'Sapatos do Assassino', name_en: 'Assassin Shoes', type: 'shoes', bonusGroup: 'LEATHER_SHOES', weight: 1.3 },

    { baseId: 'SHOES_CLOTH_SET1', name_pt: 'Sandálias do Mago', name_en: 'Mage Sandals', type: 'shoes', bonusGroup: 'CLOTH_SHOES', weight: 1.1 },
    { baseId: 'SHOES_CLOTH_SET2', name_pt: 'Sandálias do Erudito', name_en: 'Scholar Sandals', type: 'shoes', bonusGroup: 'CLOTH_SHOES', weight: 1.1 },
    { baseId: 'SHOES_CLOTH_SET3', name_pt: 'Sandálias do Clérigo', name_en: 'Cleric Sandals', type: 'shoes', bonusGroup: 'CLOTH_SHOES', weight: 1.1 },

    // Accessories
    { baseId: 'BAG', name_pt: 'Bolsa', name_en: 'Bag', type: 'bag', bonusGroup: 'BAG', weight: 1.5 },
    { baseId: 'CAPE', name_pt: 'Capa', name_en: 'Cape', type: 'cape', bonusGroup: 'CAPE', weight: 1.0 }
  ];

  // Seed equipment from T4 to T8, with enchants .1, .2, .3, .4
  for (let tier = 4; tier <= 8; tier++) {
    equipment.forEach(eq => {
      for (let ench = 0; ench <= 4; ench++) {
        const id = ench === 0 ? `T${tier}_${eq.baseId}` : `T${tier}_${eq.baseId}@${ench}`;
        const suffix = ench === 0 ? '' : `.${ench}`;
        itemsToInsert.push({
          id,
          name_pt: `${eq.name_pt} T${tier}${suffix}`,
          name_en: `${eq.name_en} T${tier}${suffix}`,
          tier,
          enchantment: ench,
          item_type: 'equipment',
          weight: eq.weight
        });
      }
    });
  }

  // Insert all items
  console.log(`Inserting ${itemsToInsert.length} items into static database...`);
  
  // Clean up existing items and prices to avoid orphan data from the old malformed ID format
  try {
    await query.run('DELETE FROM prices');
    await query.run('DELETE FROM items');
    console.log('Cleaned up existing items and prices tables.');
  } catch (err) {
    console.error('Failed to clean tables:', err.message);
  }

  // Use a transaction or run in sequence (wrapped inside query)
  await query.run('BEGIN TRANSACTION');
  try {
    for (const item of itemsToInsert) {
      await query.run(
        `INSERT OR REPLACE INTO items (id, name_pt, name_en, tier, enchantment, item_type, weight)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name_pt, item.name_en, item.tier, item.enchantment, item.item_type, item.weight]
      );
    }
    await query.run('COMMIT');
    console.log('Items seeded successfully.');
  } catch (err) {
    await query.run('ROLLBACK');
    console.error('Failed to seed items, transaction rolled back:', err.message);
  }

  console.log('Seeding process finished.');
  process.exit(0);
}

seed();
