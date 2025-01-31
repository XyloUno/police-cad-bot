const { Collection, Client, MessageEmbed } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const Logger = require("../util/Logger");
const io = require('socket.io-client');
const path = require("path");
const fs = require('fs');

class LinesPoliceCadBot extends Client {

  constructor(options, config) {
    super(options)

    this.config = config;
    this.commands = new Collection();
    this.logger = new Logger(path.join(__dirname, "..", "logs/Logs.log"));

    if (this.config.Token === "")
    return new TypeError(
      "The botconfig.js is not filled out. Please make sure nothing is blank, otherwise the bot will not work properly."
    );

    this.db;
    this.dbo;
    this.connectMongo(this.config.mongoURI, this.config.dbo);
    this.LoadCommands();
    this.LoadEvents();

    this.Ready = false;

    this.ws.on("INTERACTION_CREATE", async (interaction) => {
      client.log("Interaction")
      let GuildDB = await this.GetGuild(interaction.guild_id);

      if (interaction.type==3) return;
      

      const command = interaction.data.name.toLowerCase();
      const args = interaction.data.options;

      //Easy to send respnose so ;)
      interaction.guild = await this.guilds.fetch(interaction.guild_id);
      interaction.send = async (message) => {
        return await this.api
          .interactions(interaction.id, interaction.token)
          .callback.post({
            data: {
              type: 4,
              data:
                typeof message == "string"
                  ? { content: message }
                  : message.type && message.type === "rich"
                  ? { embeds: [message] }
                  : message,
            },
          });
      };
      let cmd = client.commands.get(command);
      if (cmd.SlashCommand && cmd.SlashCommand.run)
        cmd.SlashCommand.run(this, interaction, args, { GuildDB });
    });

    const client = this;
  }

  async connectMongo(mongoURI, dbo) {
    this.db = await MongoClient.connect(mongoURI,{useUnifiedTopology:true});
    this.dbo = this.db.db(dbo);
    this.log('Successfully connected to mongoDB');
  }

  // This is for the 'panic' command when enabling panic
  // May be used by other interaction
  async forceUpdateStatus(sendObject, userID, status) {
    let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80', '10-41', '10-42', 'Panic'];
    let user = await this.dbo.collection("users").findOne({"user.discord.id":userID}).then(user => user);
    if (!user) return returnMessage(`You are not logged in <@${userID}>`);
    if (user.user.activeCommunity==null) return returnMessage(`You must join a community to use this command.`);
    if (!validStatus.includes(status)) return returnMessage(`\`${status}\` is a Invalid Status.`);
    let onDuty=null;
    let updateDuty=false;
    if (status=='10-41') {
      onDuty=true;
      updateDuty=true;
      status='Online';
    }
    if (status=='10-42') {
      onDuty=false;
      updateDuty=true;
      status='Offline';
    }
    let req={
      userID: user._id,
      status: status,
      setBy: 'Self',
      onDuty: onDuty,
      updateDuty: updateDuty
    };
    const socket = io.connect(this.config.socket);
    socket.emit('bot_update_status', req);
    socket.on('bot_updated_status', (res) => {
      sendObject.send(`Succesfully updated status to \`${status}\` <@${userID}>`);
      socket.disconnect();
    });
  }

  exists(n){return null!=n&&null!=n&&""!=n}

  LoadCommands() {
    let CommandsDir = path.join(__dirname, '..', 'commands');
    fs.readdir(CommandsDir, (err, files) => {
      if (err) this.log(err);
      else
        files.forEach((file) => {
          let cmd = require(CommandsDir + "/" + file);
          if (!cmd.name || !cmd.description || !cmd.run)
            return this.log(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", Reason: File doesn't had run/name/desciption"
            );
          this.commands.set(file.split(".")[0].toLowerCase(), cmd);
          this.log("Command Loaded: " + file.split(".")[0]);
        });
    });
  }

  LoadEvents() {
    let EventsDir = path.join(__dirname, '..', 'events');
    fs.readdir(EventsDir, (err, files) => {
      if (err) this.log(err);
      else
        files.forEach((file) => {
          const event = require(EventsDir + "/" + file);
          this.on(file.split(".")[0], event.bind(null, this));
          this.logger.log("Event Loaded: " + file.split(".")[0]);
        });
    });
  }

  sendTime(Channel, Error) {
    let embed = new MessageEmbed()
      .setColor(this.config.EmbedColor)
      .setDescription(Error);

    Channel.send(embed);
  }

  RegisterSlashCommands() {
    this.guilds.cache.forEach((guild) => {
      require("../util/RegisterSlashCommands")(this, guild.id);
    });
  }

  async checkRoleStatus(rolesCache, serverID, isList) {
    let hasRole = false;
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":serverID}).then(guild => guild);
    // If user has one of any in the list of allowed roles, hasRole is true
    for (let i = 0; i < guild.server.allowedRoles.length; i++) {
      if (!isList) {
        if (rolesCache.some(role => role.id == guild.server.allowedRoles[i])) {
          hasRole = true
          break
        }
      } else {
        if (rolesCache.includes(guild.server.allowedRoles[i])) {
          hasRole = true
          break
        }
      }
    }
    return hasRole;
  }

  async GetGuild(GuildId) {
    let prefix;
    let customRoleStatus;
    let customChannelStatus;
    let allowedChannels;
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":GuildId}).then(guild => guild);

      // If guild not found, generate guild default
      if (!guild) {
        let newGuild = {
          server: {
            serverID: GuildId,
            prefix: this.config.DefaultPrefix,
            hasCustomRoles: false,
            hasCustomChannels: false,
          }
        }
        this.dbo.collection("prefixes").insertOne(newGuild, function(err, res) {
          if (err) throw err;
        });
        prefix = newGuild.server.prefix;
        customRoleStatus = newGuild.server.hasCustomRoles;
        customChannelStatus = newGuild.server.hasCustomChannels;
        allowedChannels = null;
      } else {
        prefix = guild.server.prefix;
        customRoleStatus = guild.server.hasCustomRoles;
        customChannelStatus = guild.server.hasCustomChannels;
        if (guild.server.allowedChannels!=undefined||guild.server.allowedChannels!=null&&guild.server.allowedChannels.length>0) {
          allowedChannels = guild.server.allowedChannels;
        } else allowedChannels = null;
      }
    let guildData = {
      prefix: prefix,
      allowedChannels: allowedChannels,
      customRoleStatus: customRoleStatus,
      customChannelStatus: customChannelStatus,
      serverID: GuildId
    }
    return guildData;
  }

  /*
   This command is to verify a user
   has the correct role to use a 
   command ie. has cop role to use
   name-search
  */
  async verifyUseCommand(serverID, rolesCache, isList) {
    let { customRoleStatus } = await this.GetGuild(serverID)
    if (customRoleStatus) {
      let hasRole = await this.checkRoleStatus(rolesCache, serverID, isList);
      if (hasRole) {
        return true // User has role, can use command
      } else return false // User does not have role, can't use command
    } else return true // There is no role limits
  }

  log(Text) {
    this.logger.log(Text);
  }

  sendError(Channel, Error) {
    let embed = new MessageEmbed()
      .setTitle("An error occured")
      .setColor("RED")
      .setDescription(Error)
      .setFooter(
        "If you think this as a bug, please report it in the support server!"
      );

    Channel.send(embed);
  }


  build() {
    this.login(this.config.Token);
  }
}

module.exports = LinesPoliceCadBot;