const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "platesearch",
  description: "Search for a registered Vehicle",
  usage: "[Plate #]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["plate_search", "platedb", "plate_db"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args) => {
    let useCommand = await client.verifyUseCommand(GuildDB.serverID, message.member.roles.cache, false);
    if (!useCommand) return message.channel.send("You don't have permission to use this command");

    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in.`);
    if (args.length==0) return message.channel.send(`You are missing a \`Plate #\`.`);
    let data = {
      user: user,
      query: {
        plateNumber: args[0],
        activeCommunityID: user.user.activeCommunity
      }
    }
    const socket = io.connect(client.config.socket);
    socket.emit('bot_plate_search', data);
    socket.on('bot_plate_search_results', results => {
      
      if (results.user._id==user._id) {
        if (results.vehicles.length == 0) {
          return message.channel.send(`Plate Number \`${args[0]}\` not found.`);
        }

        for (let i = 0; i < results.vehicles.length; i++) {
          let plateResult = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.vehicles[i].vehicle.plate} | ${results.vehicles[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
          .setDescription('Plate Search Results')
          .addFields(
            { name: `**Plate #**`, value: `\`${results.vehicles[i].vehicle.plate}\``, inline: true },
            { name: `**Vin #**`, value: `\`${results.vehicles[i].vehicle.vin}\``, inline: true },
            { name: `**Model**`, value: `\`${results.vehicles[i].vehicle.model}\``, inline: true },
            { name: `**Color**`, value: `\`${results.vehicles[i].vehicle.color}\``, inline: true },
            { name: `**Owner**`, value: `\`${results.vehicles[i].vehicle.registeredOwner}\``, inline: true },
          )
          // Other details
          let validRegistration = results.vehicles[i].vehicle.validRegistration;
          let validInsurance = results.vehicles[i].vehicle.validInsurance;
          let stolen = results.vehicles[i].vehicle.isStolen;
          if (validRegistration=='1') plateResult.addFields({ name: `**Registration**`, value: `\`Valid\``, inline: true });
          if (validRegistration=='2') plateResult.addFields({ name: `**Registration**`, value: `\`InValid\``, inline: true });
          if (validInsurance=='1') plateResult.addFields({ name: `**Insurance**`, value: `\`Valid\``, inline: true });
          if (validInsurance=='2') plateResult.addFields({ name: `**Insurance**`, value: `\`InValid\``, inline: true });
          if (stolen=='1') plateResult.addFields({ name: `**Stolen**`, value: `\`No\``, inline: true });
          if (stolen=='2') plateResult.addFields({ name: `**Stolen**`, value: `\`Yes\``, inline: true });
          message.channel.send({ embeds: [plateResult] });
        }
      }
      socket.disconnect();
    });
  },
  SlashCommand: {
    options: [
      {
        name: "platenumber",
        description: "Vehicle's license plate number",
        value: "platenumber",
        type: 3,
        required: true,
      },
    ],  
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send(`You are not allowed to use the bot in this channel.`);
      }

      let useCommand = await client.verifyUseCommand(GuildDB.serverID, interaction.member.roles, true);
      if (!useCommand) return interaction.send("You don't have permission to use this command");
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send(`You are not logged in.`);
      let data = {
        user: user,
        query: {
          plateNumber: args[0].value,
          activeCommunityID: user.user.activeCommunity
        }
      }
      const socket = io.connect(client.config.socket);
      socket.emit('bot_plate_search', data);
      socket.on('bot_plate_search_results', results => {
        
        if (results.user._id==user._id) {
          if (results.vehicles.length == 0) {
            return interaction.send(`Plate Number \`${args[0].value}\` not found.`);
          }

          for (let i = 0; i < results.vehicles.length; i++) {
            let plateResult = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`**${results.vehicles[i].vehicle.plate} | ${results.vehicles[i]._id}**`)
            .setURL('https://discord.gg/jgUW656v2t')
            .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
            .setDescription('Plate Search Results')
            .addFields(
              { name: `**Plate #**`, value: `\`${results.vehicles[i].vehicle.plate}\``, inline: true },
              { name: `**Vin #**`, value: `\`${results.vehicles[i].vehicle.vin}\``, inline: true },
              { name: `**Model**`, value: `\`${results.vehicles[i].vehicle.model}\``, inline: true },
              { name: `**Color**`, value: `\`${results.vehicles[i].vehicle.color}\``, inline: true },
              { name: `**Owner**`, value: `\`${results.vehicles[i].vehicle.registeredOwner}\``, inline: true },
            )
            // Other details
            let validRegistration = results.vehicles[i].vehicle.validRegistration;
            let validInsurance = results.vehicles[i].vehicle.validInsurance;
            let stolen = results.vehicles[i].vehicle.isStolen;
            if (validRegistration=='1') plateResult.addFields({ name: `**Registration**`, value: `\`Valid\``, inline: true });
            if (validRegistration=='2') plateResult.addFields({ name: `**Registration**`, value: `\`InValid\``, inline: true });
            if (validInsurance=='1') plateResult.addFields({ name: `**Insurance**`, value: `\`Valid\``, inline: true });
            if (validInsurance=='2') plateResult.addFields({ name: `**Insurance**`, value: `\`InValid\``, inline: true });
            if (stolen=='1') plateResult.addFields({ name: `**Stolen**`, value: `\`No\``, inline: true });
            if (stolen=='2') plateResult.addFields({ name: `**Stolen**`, value: `\`Yes\``, inline: true });
            return interaction.send(plateResult);
          }
        }
        socket.disconnect();
      });
    },
  },
}