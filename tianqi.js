const express = require("express");
const cheerio = require("cheerio");
const superagent = require("superagent");
const charset = require("superagent-charset");
const { next } = require("cheerio/lib/api/traversing");
const app = express();

const citys = ["杭州", "夏邑", "北京"];
const year = 2020;
const months = ['06','09','10']

function getCityUrl(city) {
  return new Promise((resolve, reject) => {
    superagent.get('http://lishi.tianqi.com/').end((err, sres) => {
      if (err) {
        return next(err);
      }
      let $ = cheerio.load(sres.text);
      let href = $(".tablebox").find("a[title='"+city+"历史天气']").attr("href");
      // console.log(href)
      resolve(href)
    })
  })
}

app.get('/', (req, res, next) => {
  let cityUrlList = [];
  cityUrlList = citys.map(city => {
    return getCityUrl(city);
  })
  Promise.all(cityUrlList).then(urlList => {
    let item = [];
    urlList.forEach(url => {
      months.forEach(month => {
        let reqUrl = 'http://lishi.tianqi.com/'+url.replace('index', year+month);
        superagent.get(reqUrl).end((err, sres) => {
          if (err) {
            return nexr(err);
          }
          let $ = cheerio.load(sres.text);
          item.push({
            city: url.split('/')[0],
            date: year+'年'+month,
            data: $(".tian_twoa").text(),
          })
        })
      })
    })
    res.send(item)
  })
})

app.listen(4000, ()=>{
  console.log("server up");
})