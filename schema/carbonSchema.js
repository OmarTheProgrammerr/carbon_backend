const { Schema, model } = require("mongoose");

const reqString = {
    type: String,
    required: true,
};

carbonRegions = new Schema({
    "location": reqString,
    "AWSServer": reqString,
    "AzureServer": reqString,
    "SESEndpoint": reqString,
});

module.exports = {
    carbonRegions: model("CarbonRegion", carbonRegions),
}