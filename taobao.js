const chromePaths = require('chrome-paths');
const puppeteer = require('puppeteer-core');

const sleep = time => {
  return new Promise((resolve, reject) => {
      setTimeout(resolve, time)
  })
}

//自动滚动请求
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function move(page, initialX, initialY, xlength = 0, ylength = 0) {
  const mouse = page.mouse
  await mouse.move(initialX, initialY)
  await mouse.down()
  await mouse.move(initialX + xlength, initialY + ylength, { steps: 20 })
  await page.waitForTimeout(2000)
  await mouse.up()
}

async function main() {
  const browser = await puppeteer.launch({ //启动配置
    headless: false, // 使无头浏览器可见，便于开发过程当中观察
    executablePath: chromePaths.chrome, //可执行文件的路劲，默认是使用它自带的chrome webdriver，chrome-paths.chrome会返回本机chrome地址
    ignoreDefaultArgs: ["--enable-automation"],
  });
  const page = await browser.newPage();// 打开新的空白页
  await page.evaluateOnNewDocument(() => { // 在每个新页面打开前执行以下脚本，否则会被识别出为chrome webdriver
    const newProto = navigator.__proto__;
    delete newProto.webdriver;  //删除navigator.webdriver字段
    navigator.__proto__ = newProto;
    window.chrome = {};  //添加window.chrome字段，为增加真实性还需向内部填充一些值
    window.chrome.app = {"InstallState":"hehe", "RunningState":"haha", "getDetails":"xixi", "getIsInstalled":"ohno"};
    window.chrome.csi = function(){};
    window.chrome.loadTimes = function(){};
    window.chrome.runtime = function(){};
    Object.defineProperty(navigator, 'userAgent', {  //userAgent在无头模式下有headless字样，所以需覆写
        get: () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36",
    });
    Object.defineProperty(navigator, 'plugins', {  //伪装真实的插件信息
        get: () => [{"description": "Portable Document Format",
                    "filename": "internal-pdf-viewer",
                    "length": 1,
                    "name": "Chrome PDF Plugin"}]
    });
    Object.defineProperty(navigator, 'languages', { //添加语言
        get: () => ["zh-CN", "zh", "en"],
    });
    const originalQuery = window.navigator.permissions.query; //notification伪装
    window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
    );
  })

  await page.goto('https://login.taobao.com/member/login.jhtml?spm=a21bo.jianhua.754894437.1.5af911d913DtRD&f=top&redirectURL=https%3A%2F%2Fwww.taobao.com%2F')//填写前往页面

  //等待登录表单加载出来
  await page.waitForSelector("#login-form") 

  // 填充账号密码
  await page.type('#fm-login-id', '18738995001', { delay: 50 });
  await page.type('#fm-login-password', 'wangf199629', { delay: 50 });

  // 判断是否需要滑块验证
  const isShowSlider = await page.$eval("#login-form > div.fm-field.baxia-container-wrapper > div.baxia-container.tb-login", el=>window.getComputedStyle(el).display != 'none');
  if (isShowSlider) {
    // 获取滑块iframe
    const frame = await page.frames().find(frame => !!~frame.url().search("login.taobao.com//newlogin/account/check.do/"))
    // 获取iframe中的滑块
    const verifyBlock = await frame.$('#nc_1_n1z');
    if (verifyBlock) {
      const box = await verifyBlock.boundingBox(); //boundingBox获取滑块的位置
      const initialX = Math.floor(box.x + box.width / 2);
      const initialY = Math.floor(box.y + box.height / 2);
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(1000)
        move(page, initialX, initialY, 310)  //自定义的move方法,310可设置随机数，（大于滑动条-滑动框）就好
        await page.waitForTimeout(1000)
        const errEl = await frame.$('#nocaptcha > div > span');
        if (errEl) {
          //出错， 将错误重置
          console.log("登录失败")
          await frame.click('#nocaptcha > div > span > a')
          await frame.waitForSelector('#nc_1_n1z') 
        } else {
          console.log("登录成功")
          let slideEl = await frame.$('#nocaptcha > div')
          if (!slideEl) {
            //即没有错误， 也没有滑块
            break
          }
        }
      }
    }
    
  }
  // await page.click('#login-form > div.fm-btn > button', { delay: 50 }) //登录

  // await page.waitForSelector('.taobao') // 等待首页加载出来
  // await autoScroll(page); // 滚到到底部（高度可以自己计算），保证页面全部加载

  // await page.waitForSelector('.taobao>div:nth-child(9)') // 等待爬取内容加载完成

  // const result = await page.evaluate( () => {
  //   let arrList = [];
  //   const itemList = document.querySelectorAll("body > div.layer.clearfix > div > div > div > ul > a");
  //   for (var element of itemList) {
  //     const List = {};
  //     const title = element.querySelector('.info>h4').innerText
  //     List.title = title;
  //     arrList.push(List);
  //   }
  //   return arrList
  // });
  // console.log(result)
}
main()