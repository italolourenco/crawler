const http = require("http");

const BASE_URL = 'http://applicant-test.us-east-1.elasticbeanstalk.com/'
const SECURITY_SCRIPT_NAME = 'adpagespeed.js'
const TOKEN_AUTHORIZATION = "Basic cHJveHl1c2VyOmMycEMxVk80N3FaTm96NmxkRg=="

function getToken(htmlResponse){
    
    const regex = new RegExp("value\=\"([A-Za-z0-9 _]*)\"")
    const tokenFullValue = htmlResponse.match(regex)[0];
    const token = tokenFullValue.split("=")[1].replace(/"/g, "")
    
    return token
}

function getCookie(response){
    
    const cookieFullValue = response.headers['set-cookie']
    const cookie = cookieFullValue[0].split(";")[0]

    return cookie
}

function formatJsonObject(replacementsFullValue){

    const replacements = replacementsFullValue.replace("replacements=", "")
    const replacementsFormatToJson = replacements.replace(/'/g,'"')
    const replacementsJsonObject = (JSON.parse(replacementsFormatToJson.replace(/\\/g, "\\\\")))

    return replacementsJsonObject

}

function getReplaceObject(jsResponse){

    const regex = new RegExp("replacements=\{(?:[^{}]|(R))*\}");
    const replacementsFullValue = jsResponse.match(regex)[0];
    const replaceJsonObject = formatJsonObject(replacementsFullValue)

    return replaceJsonObject
}

function parseToken(token, replaceObject){

    let splitToken = token.split("")
    let i = 0;
    
    for(splitToken, i; i < splitToken.length; i++){
        let value = replaceObject.hasOwnProperty(splitToken[i]) 
                    ? String.fromCharCode(replaceObject[splitToken[i]].replace("\\", "0")) 
                    : splitToken[i]
        
        splitToken[i] = value
    }

    const parsedToken = splitToken.join("")

    return parsedToken 

}

function formatToken(parsedToken){

    return `${encodeURI('token')}=${encodeURI(parsedToken)}`;
}

function getOptionsPostRequest(cookie, contentLengthValue){

    const optionsRequest = {
        hostname: 'applicant-test.us-east-1.elasticbeanstalk.com',
        path: '/',
        method: 'POST',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,/;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': contentLengthValue,
            'Proxy-Authorization' : TOKEN_AUTHORIZATION,
            'Upgrade-Insecure-Requests' : 1,
            'Cookie' : cookie,
            'Referer' : 'http://applicant-test.us-east-1.elasticbeanstalk.com/'
        }
    };

    return optionsRequest

}

function getAnswer(htmlResponse){

    const regex = new RegExp(/>([^<]*)/)
    const answer = htmlResponse.match(regex)[1]

    return answer
}

async function start(){

    http.get(BASE_URL, (res) => {
        res.setEncoding('utf8');
        res.on('data', (body) => {

            const token = getToken(body)
            const cookieValue = getCookie(res)

            http.get(BASE_URL + SECURITY_SCRIPT_NAME, (jsresponse) => {
                jsresponse.setEncoding('utf8');
                jsresponse.on('data', (responseBody) => {

                    try {

                        const replaceObject = getReplaceObject(responseBody);

                        const parsedToken = parseToken(token, replaceObject)
    
                        const xFormBody = formatToken(parsedToken)
    
                        const optionsRequest = getOptionsPostRequest(cookieValue, xFormBody.length)
    
                        const postRequest = http.request(optionsRequest, lastResponse => {
                            lastResponse.setEncoding('utf8');
                            lastResponse.on('data', bodyLastResponse => {
                             
                                const answer = getAnswer(bodyLastResponse)
    
                                console.log("Answer = ", answer)
    
                            })
                          })
                                               
                          postRequest.write(xFormBody)
                          postRequest.end()

                    }
                    catch (error) {
                        jsresponse.destroy()
                        start();
                    }
                })
            })
        });
});

}

start();