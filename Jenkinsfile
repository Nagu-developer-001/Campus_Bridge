def runCommand(String unixCommand, String windowsCommand) {
  if (isUnix()) {
    sh unixCommand
  } else {
    bat windowsCommand
  }
}

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    CI = "true"
  }

  stages {
    stage("Checkout") {
      steps {
        checkout scm
      }
    }

    stage("Install Dependencies") {
      steps {
        script {
          runCommand(
            "node --version && npm --version && npm ci",
            "node --version && npm --version && npm.cmd ci"
          )
        }
      }
    }

    stage("Backend Syntax Check") {
      steps {
        script {
          runCommand(
            """
            node --check server/index.js
            node --check server/models/AdminUser.js
            node --check server/models/Alumni.js
            node --check server/models/ReferralRequest.js
            node --check server/models/ExpertRequest.js
            node --check server/routes/authRoutes.js
            node --check server/routes/alumniRoutes.js
            node --check server/routes/referralRoutes.js
            node --check server/routes/expertRequestRoutes.js
            node --check server/services/adminAuthService.js
            node --check server/services/emailService.js
            node --check server/middleware/authenticateAdmin.js
            """,
            """
            node --check server\\index.js
            node --check server\\models\\AdminUser.js
            node --check server\\models\\Alumni.js
            node --check server\\models\\ReferralRequest.js
            node --check server\\models\\ExpertRequest.js
            node --check server\\routes\\authRoutes.js
            node --check server\\routes\\alumniRoutes.js
            node --check server\\routes\\referralRoutes.js
            node --check server\\routes\\expertRequestRoutes.js
            node --check server\\services\\adminAuthService.js
            node --check server\\services\\emailService.js
            node --check server\\middleware\\authenticateAdmin.js
            """
          )
        }
      }
    }

    stage("Frontend Production Build") {
      steps {
        script {
          runCommand("npm run build", "npm.cmd run build")
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: "client/dist/**,output/pdf/*.pdf", allowEmptyArchive: true
    }
    success {
      echo "CampusBridge Jenkins pipeline completed successfully."
    }
    failure {
      echo "CampusBridge Jenkins pipeline failed. Check the failed stage logs."
    }
  }
}
