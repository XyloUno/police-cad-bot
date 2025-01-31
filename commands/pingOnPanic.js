const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "pingonpanic",
  description: "Get ping on panic status",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["pingonpanicstatus"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message) => {
    let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    return message.channel.send(`Current Ping on Panic Status: ${guild.server.pingOnPanic}`);
  },
  SlashCommand: {
    options: [],  
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").MessageCreate} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send(`You are not allowed to use the bot in this channel.`);
      }
    
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      return interaction.send(`Current Ping on Panic Status: \` ${guild.server.pingOnPanic.toString().toUpperCase()} \``);  
    },
  },
}