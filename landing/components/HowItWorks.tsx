import { HOW_IT_WORKS } from '@/lib/constants'

export default function HowItWorks() {
  return (
    <section className="py-20 bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-primary mb-4">
            Как это работает
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Три простых шага до первого алерта
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector line */}
              {index < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-accent to-transparent" />
              )}

              <div className="card text-center relative">
                {/* Step number */}
                <div className="w-16 h-16 bg-accent/10 border-2 border-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-heading font-bold text-accent">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-heading font-semibold text-text-primary mb-3">
                  {item.title}
                </h3>

                <p className="text-text-secondary">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
