const cheerio = require('cheerio');
const axios = require('axios');

module.exports = {
  name: 'framedata',
  aliases: ['fd', 'frames'],
  description: 'Get frame data for a character or specific move from ultimateframedata.com',
  async execute(message, args) {
    if (!args.length) {
      return message.reply('Please specify a character name. Example: `!framedata mario` or `!framedata mario fair`');
    }

    // Extract character name and optional move
    let characterName = args[0].toLowerCase();
    let moveName = args.length > 1 ? args[1].toLowerCase() : null;
    
    // Map of common character name variations to their URL format
    const characterMap = {
      'dk': 'donkeykong',
      'donkey': 'donkeykong',
      'donkey-kong': 'donkeykong',
      'k.rool': 'krool',
      'king-k-rool': 'krool',
      'krool': 'krool',
      'falcon': 'captainfalcon',
      'captain': 'captainfalcon',
      'dedede': 'kingdedede',
      'king-dedede': 'kingdedede',
      'ddd': 'kingdedede',
      'game-and-watch': 'gameandwatch',
      'gnw': 'gameandwatch',
      'game&watch': 'gameandwatch',
      'ice-climbers': 'iceclimbers',
      'popo': 'iceclimbers',
      'nana': 'iceclimbers',
      'ics': 'iceclimbers',
      'diddy': 'diddykong',
      'diddy-kong': 'diddykong',
      'pt': 'pokemontrainer',
      'pokemon': 'pokemontrainer',
      'trainer': 'pokemontrainer',
      'squirtle': 'pokemontrainer',
      'ivysaur': 'pokemontrainer',
      'charizard': 'pokemontrainer',
      'rob': 'rob',
      'r.o.b': 'rob',
      'tink': 'toonlink',
      'toon': 'toonlink',
      'toon-link': 'toonlink',
      'pac': 'pacman',
      'pac-man': 'pacman',
      'pacman': 'pacman',
      'zss': 'zerosuitsamus',
      'zero-suit': 'zerosuitsamus',
      'zero-suit-samus': 'zerosuitsamus',
      'rosalina': 'rosalina',
      'rosa': 'rosalina',
      'rosaluma': 'rosalina',
      'wii-fit': 'wiifittrainer',
      'wft': 'wiifittrainer',
      'wii-fit-trainer': 'wiifittrainer',
      'mac': 'littlemac',
      'little-mac': 'littlemac',
      'megaman': 'megaman',
      'mega-man': 'megaman',
      'villager': 'villager',
      'wario': 'wario',
      'doc': 'drmario',
      'dr-mario': 'drmario',
      'doctor': 'drmario',
      'dark-pit': 'darkpit',
      'lucina': 'lucina',
      'robin': 'robin',
      'shulk': 'shulk',
      'bowser-jr': 'bowserjr',
      'bjr': 'bowserjr',
      'junior': 'bowserjr',
      'duck-hunt': 'duckhunt',
      'dog': 'duckhunt',
      'dh': 'duckhunt',
      'ryu': 'ryu',
      'cloud': 'cloud',
      'corrin': 'corrin',
      'bayonetta': 'bayonetta',
      'bayo': 'bayonetta',
      'inkling': 'inkling',
      'ridley': 'ridley',
      'simon': 'simon',
      'richter': 'richter',
      'k-rool': 'krool',
      'isabelle': 'isabelle',
      'incineroar': 'incineroar',
      'incin': 'incineroar',
      'plant': 'piranhaplant',
      'piranha': 'piranhaplant',
      'piranha-plant': 'piranhaplant',
      'joker': 'joker',
      'hero': 'hero',
      'banjo': 'banjo',
      'banjo-kazooie': 'banjo',
      'terry': 'terry',
      'byleth': 'byleth',
      'minmin': 'minmin',
      'min-min': 'minmin',
      'steve': 'steve',
      'alex': 'steve',
      'sephiroth': 'sephiroth',
      'seph': 'sephiroth',
      'pyra': 'pyra',
      'mythra': 'mythra',
      'pyra/mythra': 'pyra',
      'pythra': 'pyra',
      'kazuya': 'kazuya',
      'sora': 'sora'
    };

    // Map common move inputs to their website format
    const moveMap = {
      'jab': 'jab',
      'jab1': 'jab1',
      'utilt': 'uptilt',
      'up-tilt': 'uptilt',
      'uptilt': 'uptilt',
      'ftilt': 'forwardtilt',
      'forward-tilt': 'forwardtilt',
      'forwardtilt': 'forwardtilt',
      'dtilt': 'downtilt',
      'down-tilt': 'downtilt',
      'downtilt': 'downtilt',
      'usmash': 'upsmash',
      'up-smash': 'upsmash',
      'upsmash': 'upsmash',
      'fsmash': 'forwardsmash',
      'forward-smash': 'forwardsmash',
      'forwardsmash': 'forwardsmash',
      'dsmash': 'downsmash',
      'down-smash': 'downsmash',
      'downsmash': 'downsmash',
      'nair': 'neutral-air',
      'neutral-air': 'neutral-air',
      'fair': 'forward-air',
      'forward-air': 'forward-air',
      'bair': 'back-air',
      'back-air': 'back-air',
      'uair': 'up-air',
      'up-air': 'up-air',
      'dair': 'down-air',
      'down-air': 'down-air',
      'grab': 'grab',
      'dash-grab': 'dashgrab',
      'dashgrab': 'dashgrab',
      'pivot-grab': 'pivotgrab',
      'pivotgrab': 'pivotgrab',
      'pummel': 'pummel',
      'fthrow': 'forwardthrow',
      'forward-throw': 'forwardthrow',
      'forwardthrow': 'forwardthrow',
      'bthrow': 'backthrow',
      'back-throw': 'backthrow',
      'backthrow': 'backthrow',
      'uthrow': 'upthrow',
      'up-throw': 'upthrow',
      'upthrow': 'upthrow',
      'dthrow': 'downthrow',
      'down-throw': 'downthrow',
      'downthrow': 'downthrow',
      'neutral-b': 'neutral-b',
      'neutralb': 'neutral-b',
      'nspecial': 'neutral-b',
      'side-b': 'side-b',
      'sideb': 'side-b',
      'fspecial': 'side-b',
      'up-b': 'up-b',
      'upb': 'up-b',
      'uspecial': 'up-b',
      'down-b': 'down-b',
      'downb': 'down-b',
      'dspecial': 'down-b',
      'final': 'final-smash',
      'final-smash': 'final-smash',
      'finalsmash': 'final-smash'
    };

    // Map character name to website URL format
    if (characterMap[characterName]) {
      characterName = characterMap[characterName];
    }

    // Map move name to website format if provided
    if (moveName && moveMap[moveName]) {
      moveName = moveMap[moveName];
    }

    try {
      // Send initial response
      const loadingMessage = await message.reply(`⏳ Fetching frame data for ${characterName}${moveName ? ` (${moveName})` : ''}...`);
      
      // Build URL for the character's frame data
      const url = `https://ultimateframedata.com/${characterName}.php`;
      
      // Fetch the page
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // If a specific move was requested, extract that data
      if (moveName) {
        return await handleSpecificMove($, characterName, moveName, loadingMessage);
      } else {
        // Otherwise, give an overview of the character
        return await handleCharacterOverview($, characterName, loadingMessage);
      }
    } catch (error) {
      console.error('Error fetching frame data:', error);
      return message.reply(`Error fetching frame data for ${characterName}. Make sure the character name is spelled correctly.`);
    }
  }
};

async function handleCharacterOverview($, characterName, loadingMessage) {
  // Extract character info from the character info section
  const characterInfoSection = $('.char-info-container');
  
  // Use DOM traversal to find stats in the proper elements
  // UFD site has a specific structure with class names we need to target
  const stats = {};
  
  // Character stats are typically in a table or specific divs
  $('.stats-grid .stat').each((i, el) => {
    const label = $(el).find('.stat-label').text().trim();
    const value = $(el).find('.stat-value').text().trim();
    
    if (label && value) {
      // Map the stat to our structure
      if (label.includes('Weight')) stats.weight = value;
      else if (label.includes('Fall Speed')) stats.fallSpeed = value;
      else if (label.includes('Walk Speed')) stats.walkSpeed = value;
      else if (label.includes('Run Speed')) stats.runSpeed = value;
      else if (label.includes('Dash Speed')) stats.dashSpeed = value;
      else if (label.includes('Air Speed')) stats.airSpeed = value;
    }
  });
  
  // Get character image - UFD uses specific class names for the stock icons
  const charImage = $('.char-portal-image').attr('src') || 
                   $('img.stockicon').attr('src') || 
                   $('img.char-stockicon').attr('src');
  
  const imageUrl = charImage ? 
    (charImage.startsWith('http') ? charImage : `https://ultimateframedata.com/${charImage}`) : 
    null;
  
  // Compile move list by looking at move sections
  const notableMoves = [];
  
  // Try to find all moves on the page
  $('.move-section, [id^="move-"]').each((i, el) => {
    // Get the move name from either the header or ID
    let moveName;
    
    // First try to find a header
    const header = $(el).find('h2, h3, h4').first();
    if (header.length) {
      moveName = header.text().trim();
    } else {
      // If no header found, try using the ID
      const id = $(el).attr('id');
      if (id && id.startsWith('move-')) {
        moveName = id.replace('move-', '').replace(/-/g, ' ');
        moveName = moveName.charAt(0).toUpperCase() + moveName.slice(1);
      }
    }
    
    if (moveName) {
      notableMoves.push(moveName);
    }
    
    // Limit to 15 moves
    if (notableMoves.length >= 15) {
      return false;
    }
  });
  
  // If we still can't find moves, try a broader approach
  if (notableMoves.length === 0) {
    const moveSections = $('div[id^="move-"], div.move');
    
    moveSections.each((i, el) => {
      const id = $(el).attr('id') || '';
      if (id.startsWith('move-')) {
        const moveName = id.replace('move-', '').replace(/-/g, ' ');
        notableMoves.push(moveName.charAt(0).toUpperCase() + moveName.slice(1));
      }
    });
  }
  
  // Create embed
  const embed = {
    color: 0x00AAFF,
    title: characterName.charAt(0).toUpperCase() + characterName.slice(1),
    description: `Use \`!framedata ${characterName} [move]\` to see specific move data.`,
    thumbnail: imageUrl ? { url: imageUrl } : null,
    fields: [
      {
        name: 'Character Stats',
        value: [
          `**Weight:** ${stats.weight || 'N/A'}`,
          `**Fall Speed:** ${stats.fallSpeed || 'N/A'}`,
          `**Walk Speed:** ${stats.walkSpeed || 'N/A'}`,
          `**Run Speed:** ${stats.runSpeed || 'N/A'}`,
          `**Dash Speed:** ${stats.dashSpeed || 'N/A'}`,
          `**Air Speed:** ${stats.airSpeed || 'N/A'}`
        ].join('\n')
      }
    ],
    footer: {
      text: 'Data sourced from ultimateframedata.com'
    }
  };
  
  // Only add moves field if we found any
  if (notableMoves.length > 0) {
    embed.fields.push({
      name: 'Available Moves',
      value: notableMoves.slice(0, 15).join(', ') + (notableMoves.length > 15 ? '...' : '')
    });
  } else {
    embed.fields.push({
      name: 'Available Moves',
      value: 'Could not find move list'
    });
  }
  
  return loadingMessage.edit({ content: ' ', embeds: [embed] });
}

async function handleSpecificMove($, characterName, moveName, loadingMessage) {
  // The move data is located in a section with a specific ID or class
  // First try to find by ID
  const moveNameFormatted = moveName.replace(/\s+/g, '-');
  
  let moveSection = $(`#move-${moveNameFormatted}`);
  let moveTitle = moveName;
  
  // If not found by ID, try to find by content
  if (moveSection.length === 0) {
    $('h2, h3, h4').each((i, el) => {
      if ($(el).text().toLowerCase().includes(moveName)) {
        moveSection = $(el).closest('.move-section, [id^="move-"], .move');
        moveTitle = $(el).text().trim();
        return false; // Break the loop
      }
    });
  }
  
  // If still not found, search more broadly
  if (moveSection.length === 0) {
    $('[id^="move-"]').each((i, el) => {
      const id = $(el).attr('id');
      if (id && id.toLowerCase().includes(moveNameFormatted)) {
        moveSection = $(el);
        moveTitle = id.replace('move-', '').replace(/-/g, ' ');
        moveTitle = moveTitle.charAt(0).toUpperCase() + moveTitle.slice(1);
        return false; // Break the loop
      }
    });
  }
  
  if (moveSection.length === 0) {
    return loadingMessage.edit(`Couldn't find move "${moveName}" for ${characterName}. Check the spelling or try without specifying a move.`);
  }
  
  // Extract frame data
  const frameData = [];
  
  // Find frame data in the stats containers
  moveSection.find('.stat, .frame-stat').each((i, el) => {
    const label = $(el).find('.stat-label').text().trim();
    const value = $(el).find('.stat-value').text().trim();
    
    if (label && value) {
      frameData.push(`**${label}:** ${value}`);
    }
  });
  
  // If no structured stats found, try to parse frame data from text
  if (frameData.length === 0) {
    const moveHtml = moveSection.html();
    const moveText = moveSection.text();
    
    // Common frame data patterns
    const patterns = [
      { name: 'Startup', regex: /startup[:\s]+(\d+(?:-\d+)?)/i },
      { name: 'Active', regex: /active[:\s]+(\d+(?:-\d+)?)/i },
      { name: 'Total', regex: /total[:\s]+(\d+)/i },
      { name: 'On Shield', regex: /on shield[:\s]+([+-]?\d+)/i },
      { name: 'Landing Lag', regex: /landing lag[:\s]+(\d+)/i },
      { name: 'Base Damage', regex: /damage[:\s]+(\d+(?:\.\d+)?%?)/i }
    ];
    
    patterns.forEach(pattern => {
      const match = moveText.match(pattern.regex);
      if (match) {
        frameData.push(`**${pattern.name}:** ${match[1]}`);
      }
    });
  }
  
  // Get move image
  const moveImage = moveSection.find('img').attr('src') || 
                    $(`img[alt*="${moveName}"]`).attr('src');
  
  const imageUrl = moveImage ? 
    (moveImage.startsWith('http') ? moveImage : `https://ultimateframedata.com/${moveImage}`) : 
    null;
  
  // Look for notes
  let notes = "";
  moveSection.find('.notes, .move-notes').each((i, el) => {
    const noteText = $(el).text().trim();
    if (noteText) {
      notes += noteText + '\n';
    }
  });
  
  // Create embed
  const embed = {
    color: 0x00AAFF,
    title: `${characterName.charAt(0).toUpperCase() + characterName.slice(1)} - ${moveTitle}`,
    description: frameData.length > 0 ? frameData.join('\n') : 'No frame data found for this move.',
    thumbnail: imageUrl ? { url: imageUrl } : null,
    footer: {
      text: 'Data sourced from ultimateframedata.com'
    }
  };
  
  // Add notes if available
  if (notes.trim()) {
    embed.fields = [{
      name: 'Notes',
      value: notes.length > 1024 ? notes.substring(0, 1021) + '...' : notes
    }];
  }
  
  return loadingMessage.edit({ content: ' ', embeds: [embed] });
}