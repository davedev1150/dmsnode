const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://admin:pass@ewon.kmyoknu.mongodb.net/dams_WL", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

// Handle connection events
app.get("/dms/fetch-data", async (req, res) => {
  try {
    const startTime = Date.now(); // Record the start time
    

    // Make a request to the external API to fetch dams data
    const dams = await axios.get("https://dms.gfe.co.th/api/external/dams");
    // Assuming the API returns an array of objects
    const apiData = dams.data;

    // Map the data and create an array of objects with 'codename', 'name', and 'rid_under' properties
    const code_name = apiData.map((code) => ({
      codename: code.code_name,
      name: code.name,
      rid_under: code.be_under,
    }));

    // For each 'codename', make a request to fetch damdata
    const damdataPromises = code_name.map(async (item) => {
      const damResponse = await axios.get(
        `https://dms.gfe.co.th/api/external/dams/${item.codename}/latest`
      );
      return {
        codename: item.codename,
        name: item.name,
        rid_under: item.be_under,
        damdata: damResponse.data,
      };
    });

    // Wait for all the damdata requests to complete
    const damdataResults = await Promise.all(damdataPromises);

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

  
    // Save the data to MongoDB (uncomment this when you want to save to MongoDB)
    // await DataModel.insertMany(code_name);

    console.log(damdataResults);
    console.log(`Time taken: ${timeTaken}ms`); // Log the time taken
    res.json({ damdataResults, message: "Data saved to MongoDB" }); // Send the transformed data as a response
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
