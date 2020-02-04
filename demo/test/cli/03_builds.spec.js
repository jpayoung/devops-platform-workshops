// Generated by Selenium IDE
const {spawn} = require('child_process')
const path = require('path')
const fs =require('fs');
const {assert, expect} = require('chai');
const {WritableStream} = require('memory-streams');
const config = require("../config")
const cmdExitValue = path.resolve(__dirname, './.cmd.last.code');
const ttyFile = path.resolve(__dirname, './.tty');
const rcFile = path.resolve(__dirname, './.rc.sh');

let ttyDevice;

function run(cmd, options){
  const _options= options || {};
  const stdio = _options.stdio || []
  delete _options.stdio

  return new Promise((resolve, reject)=>{
    const proc = spawn(cmd[0], cmd.slice(1), _options);
    if (stdio && stdio[1]){
      proc.stdout.pipe(stdio[1])
    }
    if (stdio && stdio[2]){
      proc.stdout.pipe(stdio[2])
    }
    proc.on("exit", (code)=>{
      if (code != 0){
        return reject(new Error(`'${cmd[0]}' failed with exit code ${code}`))
      }
      resolve(code)
    })
  })
}

function showRunAndWait(cmd){
  return new Promise((resolve, reject)=>{
    let watcher=fs.watch(cmdExitValue, {persistent:true}, () => {
      watcher.close()
      fs.readFile(cmdExitValue, {encoding:'utf8'}, (err, data)=>{
        if (err) reject(err);
        resolve(parseInt(data));
      })
    })
    run([path.resolve(__dirname, '../../c/ttyecho'), '-n', ttyDevice].concat(cmd))
    .catch((err)=>{
      reject(err)
    })
  })
}

async function openTerminal(){
  return new Promise((resolve, reject)=>{
    const cwd = path.resolve(__dirname, '../../');
    const ret  = {}
    let watcher=fs.watch(ttyFile, {persistent:false}, () => {
      ret.tty = fs.readFileSync(path.resolve(__dirname, '.tty'), {encoding:'utf8'}).trim();
      ttyDevice = ret.tty;
      console.log(`tty:${ret.tty}`)
      watcher.close()
      resolve(ret);
    })
    fs.writeFileSync(rcFile, `tty > '${ttyFile}'\nPROMPT_COMMAND='printf "$?" > "${cmdExitValue}"'\nHISTFILE=\nHISTSIZE=0\nclear\necho 'Hello World'`)

    proc = spawn('osascript', [
      '-e', 'tell application "Terminal" to activate',
      '-e', 'tell application "System Events" to keystroke "n" using {command down}',
      '-e', `tell application "Terminal" to do script "source '${rcFile}'" in front window`
      ],{encoding:'utf8'});
    proc.on("error", (err)=>{
      reject(err)
    })

  })
}
describe('Build', function() {
  let tty={}
  before(async function() {
    let stdout= new WritableStream()
    await run(['whoami'], {stdio:[null, stdout, null]})
    expect(stdout.toString().trim()).to.equal("root")
    ttyDevice = fs.readFileSync(path.resolve(__dirname, '.tty'), {encoding:'utf8'}).trim();
    await run(['test', '-w', ttyDevice]).then((code)=>{
      expect(code).to.equal(0)
    })
  })

  beforeEach(async function() {

  })

  afterEach(async function() {

  })
  it("oc delete", async function() {
    await showRunAndWait([
      'oc', '-n', config.namespace.tools, 'delete', 'all', '-l', `build=rocketchat-${config.name}`, '-l', `build=mongodb-${config.name}`, '--ignore-not-found=true'
    ])
    .then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })

    await showRunAndWait([
      path.resolve(__dirname, "../../../101-materials/deleteServiceInstanceByMongoDBInstanceName.sh"),
      config.namespace.dev,
      `mongodb-${config.name}`])
    .then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })

    await showRunAndWait([
      'oc', '-n', config.namespace.tools, 'delete', 'all', '-l', `app=rocketchat-${config.name}`, '--ignore-not-found=true'
    ])
    .then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })

    await showRunAndWait([
      'oc', '-n', config.namespace.tools, 'delete', 'all', '-l', `app=mongodb-${config.name}`, '--ignore-not-found=true'
    ])
    .then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })
  })
  it("oc new-build", async function() {
    await showRunAndWait([
      'oc',
      '-n', config.namespace.tools,
      'new-build',
      'https://github.com/BCDevOps/devops-platform-workshops-labs.git',
      '--context-dir=apps/rocketchat', '--name=rocketchat-cvarjao'
    ])
    .then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })
  })

  it("wait for build to finish", async function() {
    await showRunAndWait([
      'oc', '-n', config.namespace.tools, 'logs', `build/rocketchat-cvarjao-1`, '--tail=1', '--follow=true', '> /dev/null'
    ]).then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })
  })
  it ("oc tag", async function (){
    await showRunAndWait([
      'oc', '-n', config.namespace.tools, 'tag', `${config.rocketchat.imageStream}:latest`, `${config.rocketchat.imageStream}:dev`
    ]).then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })
  })
  it("oc new-app", async function() {
    await showRunAndWait([
      'oc', '-n', config.namespace.dev, 'new-app', `${config.namespace.tools}/${config.rocketchat.imageStream}:dev`, `--name=rocketchat-${config.name}`
    ]).then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })
  })
  it.only("oc new-app", async function() {
    await showRunAndWait([
      `oc -n "${config.namespace.dev}" new-app '--template=mongodb-ephemeral' -p "DATABASE_SERVICE_NAME=mongodb-${config.name}" -p "MONGODB_DATABASE=rocketchat" -p "MONGODB_USER=dbuser" -p "MONGODB_PASSWORD=dbpass" -p "MONGODB_VERSION=2.6" --name=mongodb-${config.name}`
    ]).then((exitCode)=>{
      expect(exitCode).to.equal(0);
    })
  })
})
