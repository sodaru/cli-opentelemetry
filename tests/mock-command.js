/* eslint-disable */
console.log("Running Mock Command");

const job = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (process.env.CLI_OT_MOCK_ERROR == "true") {
      reject("Mock command failed");
    } else {
      resolve();
    }
  }, process.env.CLI_OT_MOCK_TIMEOUT || 0);
});

job.then(
  () => {
    console.log("Mock command finished successfully");
  },
  reason => {
    console.error(reason);
    process.exit(1);
  }
);
