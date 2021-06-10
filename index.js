const axios = require('axios').default;
const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");
const readFile = require('util').promisify(fs.readFile);
const BASE_URL = 'https://platform.hootsuite.com/v1/';
const SOCIAL_PROFILE_ID = '135094030';
const accessToken = '9RVLYFBZwriDYYIKjIjg6nrNAF9eWrs_RcLTjL9GVUc.q0970s3vlH0izhmeiwCR_3nw2dcR0BkEplkXGbfSvUk'


const getUploadUrl = async () => {
  const response = await axios.post(`${BASE_URL}media`, {
    sizeBytes: 1292916,
    mimeType: "video/mp4"
  }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data;
};

const uploadToS3 = async (uploadUrl, video) => {
  const file = await readFile(path.join(__dirname, `videos/${video}`));
  const conf = {
    method: 'put',
    url: uploadUrl,
    headers: {
      'Content-Type': 'video/mp4' ,
    },
    data : file
  };
  return axios(conf)
};

const scheduleMessage = async (scheduleTime, text, videoId) => {
  const response = await axios.post(`${BASE_URL}messages`, {
    text,
    socialProfileIds: [
      SOCIAL_PROFILE_ID
    ],
    scheduledSendTime: new Date(scheduleTime),
    media: [
      {
        id: videoId
      }
    ]
  }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data;
};

const main = async () => {
  const rows = parse(fs.readFileSync(path.join(__dirname, `manifest.csv`)), {columns : true});
  return Promise.all(rows.map(async (row) => {
    const {data: {id, uploadUrl}} = await getUploadUrl();
    await uploadToS3(uploadUrl, row.videoName);
    await new Promise(resolve => setTimeout(resolve, 5000)); // hootsuite needs to upload the video and errors out if we dont wait
    return scheduleMessage(row.scheduleTime, row.text, id)
  }))
};

main()
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.log(err));
