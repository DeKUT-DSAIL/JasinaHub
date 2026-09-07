import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Shield, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="glass-card p-12 rounded-3xl">
            <h1 className="text-5xl md:text-6xl font-inter font-bold text-foreground mb-6">
              Voice Data Collection
              <span className="block text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground font-inter mb-8 max-w-3xl mx-auto leading-relaxed">
              Collect high-quality voice responses through an intuitive platform. 
              Perfect for research, surveys, and data collection with seamless voice recording.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-inter font-bold text-foreground mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-muted-foreground font-inter">
              Everything you need for professional voice data collection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-3xl text-center group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-inter font-bold text-foreground mb-4">
                Voice Recording
              </h3>
              <p className="text-muted-foreground font-inter">
                High-quality voice recording with real-time feedback and easy playback options.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl text-center group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-inter font-bold text-foreground mb-4">
                Secure Storage
              </h3>
              <p className="text-muted-foreground font-inter">
                Your voice data is securely stored with enterprise-grade encryption and privacy protection.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl text-center group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-inter font-bold text-foreground mb-4">
                Progress Tracking
              </h3>
              <p className="text-muted-foreground font-inter">
                Track completion rates and resume where you left off with intelligent checkpoints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-12 rounded-3xl">
            <h2 className="text-4xl font-inter font-bold text-foreground mb-4">
              Ready to Start Collecting?
            </h2>
            <p className="text-xl text-muted-foreground font-inter mb-8">
              Join thousands of researchers and organizations using our platform
            </p>
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Create Your Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
