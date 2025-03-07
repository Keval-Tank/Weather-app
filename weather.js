let BASE = "https://goweather.herokuapp.com/weather/Curitiba";
let btn = document.querySelector(".btn");
let report = document.getElementById("report")
let weather = document.getElementById("weather");
let temp = document.getElementById("temp");
let wind = document.getElementById("wind");
let logo = document.getElementById("logo1");
let box = document.getElementById("box1");
let p2 = document.getElementById("cName");
let t1 = document.getElementById("t1");
let wi1 = document.getElementById("wi1");
let city_name = document.getElementById("cN1");
let t2 = document.getElementById("t2");
let wi2 = document.getElementById("wi2");
let t3 = document.getElementById("t3");
let wi3 = document.getElementById("wi3");
let fp = document.getElementById("fn");
let rp = document.getElementById("f1");
let flag = document.getElementById("flag");

btn.addEventListener("click", async (evt) => {
    evt.preventDefault();
    let cname = document.getElementById("in");
    let cn = cname.value;
    console.log(cn);
    if (cn === "Enter your country") {
        alert("Enter your country name to see data");
    }
    else {
        let p1 = await fetch(`https://goweather.herokuapp.com/weather/${cn.toLowerCase()}`,{cors:{origin:"*"}});
        p1.headers["Access-Control-Allow-Origin"] = "*";
        let data = await p1.json();
        const code = countries[cn];
        flag.src = `https://flagsapi.com/${code}/flat/64.png`;
        flag.style.display = "inline";
        console.log(data);
        logo.style.display = "none";
        box.style.display = "none";
        city_name.style.display = "flex";
        let d1 = data.temperature;
        let d2 = data.wind;
        let d3 = data.description;
        p2.innerText = cn;
        report.style.display = "flex";
        weather.innerText = d3;
        temp.innerText = d1;
        wind.innerText = d2;
        fp.style.display = "inline";
        wi1.innerText = data.forecast[0].wind;
        wi2.innerText = data.forecast[1].wind;
        wi3.innerText = data.forecast[2].wind;
        t1.innerText = data.forecast[0].temperature;
        t2.innerText = data.forecast[1].temperature;
        t3.innerText = data.forecast[2].temperature;
        rp.style.display = "block";
    }

});





