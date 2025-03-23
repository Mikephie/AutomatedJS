# Script Hub Converter Setup Guide

This guide will help you set up a GitHub Action workflow that automatically converts Quantumult X scripts to Surge and Loon formats using Script Hub.

## Prerequisites

- A GitHub repository for your scripts
- Basic understanding of GitHub Actions
- Your Quantumult X scripts organized in a specific folder

## Repository Structure

For this workflow to function properly, organize your repository like this:

```
your-repository/
├── .github/
│   └── workflows/
│       └── convert-scripts.yml
├── QuantumultX/
│   ├── script1.js
│   ├── script2.js
│   └── ...
├── Surge/           (will be auto-created)
├── Loon/            (will be auto-created)
└── README.md
```

## Setup Instructions

1. **Create the workflow file**:
   - Create a directory `.github/workflows/` in your repository if it doesn't exist
   - Copy the `convert-scripts.yml` workflow file into this directory

2. **Organize your scripts**:
   - Place all your Quantumult X scripts in a folder named `QuantumultX`
   - Make sure your scripts follow the proper Quantumult X format

3. **Push the changes to your repository**:
   ```bash
   git add .github/workflows/convert-scripts.yml
   git commit -m "Add script conversion workflow"
   git push
   ```

4. **Trigger the workflow**:
   The workflow will automatically run when:
   - You push changes to Quantumult X scripts in the main branch
   - A pull request is made that changes Quantumult X scripts
   - You manually trigger it from the Actions tab in your repository

## How It Works

1. When triggered, the workflow checks out your repository code
2. It sets up Node.js and installs the Script Hub CLI
3. Creates output directories for Surge and Loon if they don't exist
4. Converts each JavaScript file from the QuantumultX folder to both Surge and Loon formats
5. Commits and pushes the converted scripts back to your repository

## Troubleshooting

If the conversion fails:

1. Check that your Quantumult X scripts are valid and properly formatted
2. Verify the Script Hub CLI is properly installed and working
3. Check the GitHub Actions logs for specific error messages

## Manual Execution

To run the workflow manually:
1. Go to your repository on GitHub
2. Click on the "Actions" tab
3. Select the "Convert Scripts" workflow
4. Click "Run workflow"
5. Select the branch and click "Run workflow"

## Customization

You can customize the workflow by:
- Changing the trigger conditions
- Modifying the input and output directories
- Adding additional conversion formats if supported by Script Hub
