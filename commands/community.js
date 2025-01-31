const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "community",
  description: "Check active community",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: [],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message) => {
    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in.`);
    if (user.user.activeCommunity==null) return message.channel.send(`You are not in a community.`);
    let community = await client.dbo.collection("communities").findOne({_id:ObjectId(user.user.activeCommunity)}).then(community => community);
    if (!community) return message.channel.send(`Community not found.`);
    return message.channel.send(`You are in the community \`${community.community.name}\``);
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
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send(`You are not logged in.`);
      if (user.user.activeCommunity==null) return message.channel.send(`You are not in a community.`);
      let community = await client.dbo.collection("communities").findOne({_id:ObjectId(user.user.activeCommunity)}).then(community => community);
      if (!community) return interaction.send(`Community not found.`);
      return interaction.send(`You are in the community \`${community.community.name}\``);
    },
  },
}