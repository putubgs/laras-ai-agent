import Header from "@/components/landing-page/header";
import Footer from "@/components/landing-page/footer";
import Features from "@/components/landing-page/features";
import Hero from "@/components/landing-page/hero";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
}
