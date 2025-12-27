/* */
function showError(message) {
	const errorDiv = document.getElementById("errorMessage");
	if (errorDiv) {
		errorDiv.textContent = message;
		errorDiv.style.display = "block";
		setTimeout(() => {
			errorDiv.style.display = "none";
		}, 5000);
	}
	console.error(message);
}

function showSuccess(message) {
	const successDiv = document.getElementById("successMessage");
	if (successDiv) {
		successDiv.textContent = message;
		successDiv.style.display = "block";
		setTimeout(() => {
			successDiv.style.display = "none";
		}, 3000);
	}
}

function setLoading(show) {
	const loading = document.getElementById("loading");
	if (loading) {
		loading.style.display = show ? "block" : "none";
	}
}

function previewImage(file, previewId) {
	const reader = new FileReader();
	const previewImg = document.getElementById(previewId);

	reader.onload = function (e) {
		previewImg.src = e.target.result;
	};

	reader.readAsDataURL(file);
}
