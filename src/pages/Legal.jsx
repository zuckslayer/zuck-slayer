function Legal() {
    return (
      <div className="max-w-2xl mx-auto p-6 text-white">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy & Terms of Service</h1>
  
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Privacy Policy</h2>
          <p className="mb-4">
            We value your privacy. We do not store your password. Authentication is securely handled through Firebase.
          </p>
          <p className="mb-4">
            We only store your email and username for account functionality. This data is not shared or sold to any third parties.
          </p>
          <p>
            You may request deletion of your data at any time by contacting us through the support channels provided.
          </p>
        </section>
  
        <section>
          <h2 className="text-2xl font-semibold mb-2">Terms of Service</h2>
          <p className="mb-4">
            By using our app, you agree not to misuse the platform. This includes spam, harassment, or illegal activity.
          </p>
          <p className="mb-4">
            We reserve the right to terminate accounts that violate these terms or disrupt the community experience.
          </p>
          <p>
            Continued use of this application means you accept these policies. We may update these terms in the future.
          </p>
        </section>
      </div>
    );
  }
  
  export default Legal;
  