const axios = require("axios");
const { carbonRegions } = require("../schema/carbonSchema.js");
const getRoute = "emissions/forecasts/current";
const carbonAPI = process.env.CARBON_WEBAPI;

module.exports = {
    getBestRegion: async function(start, end) {
        const regions = await carbonRegions.find({});
        const AzureRegions = [];
        const locationToAWS = {};
        regions.forEach(doc => {
            locationToAWS[doc.location] = doc.AWSServer;
            AzureRegions.push(doc.AzureServer);
        });
        const bestRegion = await axios.get(carbonAPI + getRoute, 
            {params: {
                "location": AzureRegions,
                "dataStartAt": start,
                "dataEndAt": end,               
                }
            }).optimatalDataPoints[0];
        bestRegion.AWSServer = locationToAWS[bestRegion.location];
        return bestRegion;
    }
};
