require("dotenv").config();
const http = require("http");
const url = require('url'); // To parse the query parameters

const uname = process.env.UNAME;
const pword = process.env.PWORD;
const port = process.env.PORT || 8080;
const mediabase = process.env.MEDIABASE;

console.log(`uname: ${uname}`, `pword: ${pword}`);

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
  await Promise.all(
    baseDir.map(async (data) => {
      const CurrentType = data.name;
      const CurrentTypeDATA = await getData(CurrentType);

      await Promise.all(
        CurrentTypeDATA.map(async (data) => {
          const CurrentName = data.name;
          if (CurrentType == "movies") {
            const CurrentMediaDATA = await getData(
              CurrentType + "/" + CurrentName,
            );
            console.log("CurrentMediaDATA", CurrentMediaDATA);
            CurrentMediaDATA.map((data) => {
              const CurrentMedia = data.name;
              const extension = CurrentMedia.split(".").pop().toLowerCase();
              const medianame = CurrentMedia.replace(`.` + extension, "");
              if (videoExtensions.includes(extension)) {
                const videoURI = "/" + mediabase + "/" + CurrentType + "/" + CurrentName + "/" + CurrentMedia;
                const posterURI = "/" + mediabase + "/" + CurrentType + "/" + CurrentName + "/" + medianame + "-poster.jpg";
                mediaData.movies.push({
                  title: CurrentName,
                  videoURI: encodeURI(videoURI),
                  posterURI: encodeURI(posterURI)
                });
                console.log(`Found Video file: `, videoURI);
              }
            });
          } else if (CurrentType == "series") {
            mediaData.series.push({
              title: CurrentName,
            });
          }
          //console.log(`Type: ${CurrentType} Name: ${CurrentName}`);
        }),
      );
      return mediaData;
    }),
  );
  return mediaData;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true); // Parse the URL with query parameters
  const callbackName = parsedUrl.query.callback; // Extract the callback name
  if (parsedUrl.pathname === '/') {
    var data = await Scraper();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } else if (parsedUrl.pathname === '/process-jsonp') {
    var data = await Scraper(); // Get the data from the Scraper function

    // Wrap the JSON data in the callback function
    const responseText = `${callbackName}(${JSON.stringify(data)})`;
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(responseText);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log("Server listening on port " + port);
});
