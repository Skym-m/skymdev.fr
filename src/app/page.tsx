import '@/app/styles/style.css'
import { client } from '@/sanity/lib/client'
import ProjectList from '@/app/components/ProjectList'
import WelcomeSection from "@/app/components/WelcomeSection";

async function getProjects() {
    const query = `*[_type == "project"] | order(date desc) {
    _id,
    title,
    url,
    image,
    date,
    description,
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename
  }`

    const data = await client.fetch(query)
    return data
}

export default async function Home() {
    const projects = await getProjects()

    return (
        <>
            <WelcomeSection />

            <section id="about">
                <div className="about">
                    <img src='/skym.png' alt="SkymDev" />
                    <h1>A propos de moi</h1>
                    <h4>Bonjour ! Moi c'est Skym. Je m'appelle Yannis, je suis développeur.<br/>
                        Depuis tout petit, j'ai toujours aimé l'informatique et par dessus tout l'espace. J'ai une passion pour tout ce qui vole.<br/>
                    Tout naturellement, j'ai un esprit scientifique et j'aime énormément ce qui touche à la science
                    de manière générale.<br/>
                    J'ai 17 ans et j'ai mené, depuis quelques années, plusieurs projets.<br/>
                        Qu'ils soient audiovisuels, informatiques, graphiques, ils sont tous répertoriés plus bas.
                        Certains sont terminés, d'autres sont en cours de développement ou actifs.<br/>
                        Ils sont parfois pour des clients, et parfois pour moi-même.<br/>
                    </h4>
                </div>
            </section>

            <ProjectList projects={projects} />

            <section id="dev">
                <div className="dev">
                    <h1>Freelance</h1>
                    <h4>En tant que développeur web, je propose mes services sur Fiverr [...].</h4>
                </div>
            </section>
        </>
    )
}
