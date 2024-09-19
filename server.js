const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());

// Load standard package versions from a file
const standardPackages = JSON.parse(fs.readFileSync("standards.json", "utf8"));

app.get("/scan-project", async (req, res) => {
  const { repoUrl } = req.query;

  try {
    // Extract repo details from the provided URL
    const repoPath = repoUrl.replace("https://github.com/", "");
    
    // Try fetching package.json from 'main' or 'master' branch
    let packageJson;
    try {
      // Try fetching from 'main' branch
      const response = await axios.get(
        `https://raw.githubusercontent.com/${repoPath}/main/package.json`
      );
      packageJson = response.data;
    } catch (error) {
      // If 'main' branch fetch fails, try 'master' branch
      const response = await axios.get(
        `https://raw.githubusercontent.com/${repoPath}/master/package.json`
      );
      packageJson = response.data;
    }

    // Extract dependencies and devDependencies
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    // Combine both dependencies and devDependencies
    const allDependencies = { ...dependencies, ...devDependencies };

    if (Object.keys(allDependencies).length === 0) {
      return res.json({
        name: packageJson.name || "Unnamed Project",
        techUsed: ["No dependencies found"],
        debtScore: 0
      });
    }

    // Compare versions and calculate debt score
    const debtScore = Object.keys(standardPackages).reduce((score, pkg) => {
      if (allDependencies[pkg]) {
        const projectVersion = allDependencies[pkg].replace("^", "");
        if (projectVersion === standardPackages[pkg]) {
          score += 1;
        }
      }
      return score;
    }, 0);

    const techUsed = Object.keys(allDependencies);

    res.json({
      name: packageJson.name || "Unnamed Project",
      techUsed,
      debtScore: (debtScore / Object.keys(standardPackages).length) * 5,
    });
  } catch (error) {
    console.error("Error fetching package.json:", error.message);
    res.status(500).json({ error: "Failed to fetch package.json" });
  }
});

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
