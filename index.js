const http = require("http");

const uname = process.env.UNAME;
const pword = process.env.PWORD;
const port = process.env.PORT || 8080;

console.log(`uname: ${uname}`, `pword: ${pword}`)

// URL of your Nginx API endpoint for searching media http://${uname}:${pword}@media.brandgrand.rocks/media/movies/
const mediaSearchUrl = `http://media.brandgrand.rocks/json/`;

async function getData(uri) {
  // console.log(`Using URL: ${mediaSearchUrl} with uri of ${uri}`);
  if (uri) {
    var url = mediaSearchUrl + uri + "/";
  } else {
    var url = mediaSearchUrl;
  }
  console.log(`Getting info from: ${url}`);
  // Base64 encode your credentials
  const encodedCredentials = Buffer.from(`${uname}:${pword}`).toString(
    "base64",
  );

  // Set up the fetch options with the Authorization header
  const fetchOptions = {
    method: "GET", // or 'POST'
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/json",
    },
    // Other options like 'body' can be added here if it's a POST request
  };

  // Perform the fetch operation
  const data = await fetch(url, fetchOptions)
    .then((response) => {
      return response.json();
    }) // Assuming the response is JSON
    .catch((error) => {
      console.error("Error:", error); // Handle any errors that occur
    });

  //console.log(data);
  return data;
}

// List of common video file extensions
const videoExtensions = ["mp4", "avi", "mkv", "mov", "flv", "wmv"];

async function Scraper() {
  let mediaData = {
    series: [],
    movies: [],
  };

  const baseDir = await getData(); // /media/
  // console.log(baseDir);
  const results = await Promise.all(
    baseDir.map(async (data) => {
      const CurrentType = data.name;
      const CurrentTypeDATA = await getData(CurrentType);

      await CurrentTypeDATA.map(async (data) => {
        const CurrentName = data.name;
        if (CurrentType == "movies") {
          const CurrentMediaDATA = await getData(
            CurrentType + "/" + CurrentName,
          );
          await CurrentMediaDATA.map(async (data) => {
            const CurrentMedia = data.name;
            const extension = CurrentMedia.split(".").pop().toLowerCase();
            if (videoExtensions.includes(extension)) {
              const videoURI =
                CurrentType + "/" + CurrentName + "/" + encodeURI(CurrentMedia);
              console.log(videoURI)
              mediaData.movies.push({
                title: CurrentName,
                videoURI: videoURI,
              });
            }
          });
        } else if (CurrentType == "series") {
          mediaData.series.push({
            title: CurrentName,
          });
        }
        console.log(`Type: ${CurrentType} Name: ${CurrentName}`);
      });
      return mediaData;
    }),
  );
  return results;
}
async function GetData() {
  const data = await Scraper();
  console.log(data);
}

const server = http.createServer(async (req, res) => {
  var data = await Scraper();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
});

server.listen(port, () => {
  console.log("Server listening on port "+port);
});

GetData();
