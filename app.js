const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3000;

app.use(cors());
// Connect to MongoDB
mongoose.connect("mongodb+srv://admin:pass@ewon.kmyoknu.mongodb.net/dams_WL", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

app.get("/", async (req, res) => {
  res.send("api");
});

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
        rid_under: item.rid_under,
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
    res.json({
      damdataResults,
      message: "success",
      damslength: damdataResults.length,
    }); // Send the transformed data as a response
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/dms/dam", async (req, res) => {
  try {
    const collection = db.collection("damdatas"); // Replace with your collection name
    const data = await collection.findOne({}, { sort: { timestamp: -1 } });
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/dms/dam/:codename", async (req, res) => {
  /*[
  {
    $unwind: "$damData"
    
  },
  {
    $project: {
      name: "$damData.name",
      codename: "$damData.codename",
      rid_under: "$damData.rid_under",
      WLdata:"$damData.daminstrument",
      WLpercent:{ $arrayElemAt: ["$damData.dampercent.percentage", 0]},
      WLpercentSet:"$damData.damseries",
			
    },
  },
]*/
  const codename = req.params.codename;
  try {
    const collection = db.collection("wl_dam_data");
    const query = { codename: codename }; // Adjust the query to match your data structure
    const cursor = await collection.find(query);
    const data = await cursor.toArray(); // Convert cursor to an array
    if (!data) {
      res.status(404).json({ error: "Data not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.on("close", () => {
  client.close();
  console.log("MongoDB connection closed");
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
