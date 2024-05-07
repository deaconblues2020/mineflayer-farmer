/*
 *  wheat farming robot
 *  07.05.2024
 */
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')
const { performance } = require('perf_hooks')
const { Vec3 } = require('vec3')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 55619,
  username: 'farmer'
})

bot.once('spawn', () => {
    bot.loadPlugin(pathfinder) // load pathfinder plugin into the bot
    const defaultMovements = new Movements(bot) // create a new instance of the `Movements` class
    bot.pathfinder.setMovements(defaultMovements) // set the bot's movements to the `Movements` we just created
  })


bot.on('chat', async (username, message) => {
    if (username === bot.username) return
  
    if (message.startsWith('farm')) {
      const name = message.split(' ')[1]
      if (bot.registry.blocksByName[name] === undefined) {
        bot.chat(`${name} is not a block name`)
        return
      }
      console.log("farm " + name);
      farmLoop() 
    }
  
})

bot.on('wake', () => {
    bot.chat('Good morning!')
    setTimeout(farmLoop, 1000)
  })

async function farmLoop () {
    setTimeout(harvestLoop, 1000)
}    


/*************************************************************
 *              harvest
 *************************************************************/
async function harvestLoop () {
    try {

        // mine wheat
        console.log("starting harvest loop");
        const block = bot.findBlock({ 
            matching: (block) => {
                return block && block.type === bot.registry.blocksByName.wheat.id && block.metadata === 7
              }
        })
        
        if(block) {
            bot.pathfinder.goto(new GoalNear(block.position.x, block.position.y, block.position.z, 1)).then(() => mindeWheatBlock(block));
        } else {
            console.log("moving on to the sowing phase")
            setTimeout(sowLoop, 1000)
        }
    } catch (e) {
      console.log(e)
    }
  
}

async function mindeWheatBlock(block) {
    console.log("digging")
    await bot.dig(block)

    setTimeout(harvestLoop, 250)
}


/*************************************************************
 *              planting
 *************************************************************/

async function sowLoop () {
    try {
        // mine wheat
        console.log("starting planting loop");
        const id = [bot.registry.blocksByName.farmland.id]
        const block = bot.findBlock({ 
            matching: id,
            useExtraInfo: (block) => {
                const blockAbove = bot.blockAt(block.position.offset(0, 1, 0))
                return !blockAbove || blockAbove.type === 0
            }
        })
        
        if(block) {
            bot.pathfinder.goto(new GoalNear(block.position.x, block.position.y, block.position.z, 1)).then(() => plantSeed(block));
        } else {
            console.log("nothing more to sow, time to deposit or chill out")
            const wheat = bot.inventory.items().find(item => item.name === "wheat");
            if (wheat && wheat.count > 0) {
                setTimeout(deposit, 1000)
            } else {
              console.log("I do not have enough wheat to deposit. Sorry");
              setTimeout(gotoBed, 1000)
            }    
        }
    } catch (e) {
      console.log(e)
    }
  
}

async function plantSeed(block) {
    console.log("sowing")
    await bot.equip(bot.registry.itemsByName.wheat_seeds.id, 'hand')
    await bot.placeBlock(block, new Vec3(0, 1, 0))

    setTimeout(sowLoop, 250)
}

/*************************************************************
 *              depositing in chest
 *************************************************************/
 
function deposit() {
    const id = [bot.registry.blocksByName["chest"].id]
    const chestBlock = bot.findBlock({ matching: id })
  
    if (!chestBlock) {
        console.log("Chest not found. I am giving up.");
        return;
    }
    bot.pathfinder.goto(new GoalNear(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z, 1)).then(() => depositInChest(chestBlock, "wheat"));
  }
  
  async function depositInChest(chestBlock,name) {
  
    let chest = await bot.openChest(chestBlock)  
    for (slot of bot.inventory.slots) {
      if (slot && slot.name == name) {
        await chest.deposit(slot.type, null, slot.count);
        console.log("deposited " + slot.count + " " + name + " units");
      }
    }
  
    chest.close();

    setTimeout(gotoBed, 1000)
  }

/*************************************************************
 *     go to bed and maybe sleep
 *************************************************************/

function gotoBed() {

    let bed = bot.findBlock({
        matching: block=>bot.isABed(block),
    });

    if (!bed) {
        console.log("Couldn't find bed.");
        setTimeout(farmLoop, 1000)
    }
    bot.pathfinder.goto(new GoalNear(bed.position.x, bed.position.y, bed.position.z, 1)).then(() => goToSleep(bed));

}

async function goToSleep(bed) {
    try {
      await bot.sleep(bed) 
      bot.chat("I'm going to sleep. Nighty night.")
      console.log("I'm going to sleep. Nighty night.")
    } catch (err) {
      console.log(`I can't sleep: ${err.message}`)
      // anti-pattern - using exception handling for normal program flow
      setTimeout(farmLoop, 5000)
    }

  }